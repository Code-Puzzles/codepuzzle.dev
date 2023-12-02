import type { JudgeResultWithCount, Puzzle } from "@jspuzzles/common";

// TODO: can we make this not block the browser?
export function evalInBrowser(
  puzzle: Puzzle,
  solution: string,
): JudgeResultWithCount {
  const numChars = solution.replace(/\s*/g, "").length;
  try {
    const { name, source } = puzzle;
    const value = (void 0, eval)(
      `var ${name} = (function () { ${source}; return ${name}; })(); ${name}(${solution});`,
    );
    const passed = value === true;
    return { passed, value: String(value), numChars };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { passed: false, error, numChars };
  }
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
    const url = IS_LOCAL_DEV
      ? "http://localhost:9000/2015-03-31/functions/function/invocations"
      : `${API_BASE_URL}/judge/firefox/119.0`;

    const inner = JSON.stringify({
      puzzleNamespace: "season1",
      puzzleName: puzzle.name,
      solution,
    });
    console.log("Sending solution", inner);
    const resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ body: btoa(inner), isBase64Encoded: true }),
    });

    if (!resp.ok) {
      throw new Error(
        `Unexpected response: ${resp.status}\n${await resp.text()}`,
      );
    }

    interface LambdaResponse {
      status: number;
      headers: Record<string, string>;
      body: string;
    }

    const data: LambdaResponse = await resp.json();
    console.log("Backend result", data);
    return JSON.parse(data.body);
  }
}
