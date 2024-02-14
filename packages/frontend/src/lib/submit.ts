import { type JudgeResultWithCount, type Puzzle } from "@codepuzzles/common";

// TODO: can we make this not block the browser?
export async function evalInBrowser(
  puzzle: Puzzle,
  solution: string,
): Promise<JudgeResultWithCount> {
  // TODO: would be nice to count tokens AND characters (smallest tokens, and smallest solution)
  const numChars = solution.replace(/\s*/g, "").length;
  try {
    const { name, source } = puzzle;
    const code = `var ${name} = (function () { ${source}; return ${name}; })(); ${name}(${solution});`;
    const value = await evalInIframe(code);
    const passed = value === true;
    return { passed, value: String(value), numChars };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { passed: false, error, numChars };
  }
}

/**
 * When running the code locally, we evaluate it in an iframe that's running on
 * a separate eTLD. We run it in the iframe so when user's modify JavaScript
 * globals, they don't affect the frontend app. We run it on a different eTLD
 * so if they write code that causes an infinite blocking loop, it runs on a
 * separate browser process and avoids freezing the frontend app.
 * See:
 * - https://webperf.tips/tip/iframe-multi-process/
 * - https://web.dev/articles/origin-agent-cluster
 *
 * We're not overly concerned with defending against people trying to cheat,
 * since this is a local run. We have other mitigations for that when we submit
 * the code to the backend
 */
function evalInIframe(code: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    const src =
      // ensure in local-dev that we open the iframe on a different domain
      FRONTEND_IFRAME_EVAL_URL ??
      (window.location.host.includes("localhost")
        ? `http://127.0.0.1:${window.location.port}/local-eval.html`
        : `http://localhost:${window.location.port}/local-eval.html`);

    iframe.setAttribute("src", src);
    iframe.setAttribute("sandbox", "allow-scripts");
    document.body.append(iframe);
    iframe.onerror = function (err) {
      console.error(err);
    };
    iframe.onload = function () {
      iframe.contentWindow?.postMessage(code, "*");
    };

    let id = 0;
    const waitForMessage = (event: MessageEvent<unknown>) => {
      if (
        event.source === iframe.contentWindow ||
        event.source === iframe.contentDocument
      ) {
        clearTimeout(id);
        window.removeEventListener("message", waitForMessage);
        iframe.remove();

        const obj = event.data && typeof event.data === "object";
        if (obj && "result" in event.data) resolve(event.data.result);
        else if (obj && "error" in event.data) reject(String(event.data.error));
        else reject(new Error("Unknown error executing code"));
      }
    };
    window.addEventListener("message", waitForMessage);

    id = window.setTimeout(() => {
      window.removeEventListener("message", waitForMessage);
      iframe.remove();
      reject(new Error("Timed out"));
    }, 5_000);
  });
}

let cachedSubmit: Promise<JudgeResultWithCount> | null = null;
export async function submitToBackend(
  puzzle: Puzzle,
  solution: string,
): Promise<JudgeResultWithCount> {
  if (cachedSubmit) return cachedSubmit;

  try {
    return await (cachedSubmit = inner());
  } finally {
    cachedSubmit = null;
  }

  async function inner() {
    const resp = await fetch(`${API_BASE_URL}/judge/firefox/119.0`, {
      method: "POST",
      body: JSON.stringify({
        puzzleId: puzzle.id,
        solution,
      }),
      credentials: "include",
    });

    if (!resp.ok) {
      throw new Error(
        `Unexpected response: ${resp.status}\n${await resp.text()}`,
      );
    }

    return resp.json();
  }
}
