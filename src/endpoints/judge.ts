import { z } from "zod";
import { Browser } from "../browser/types";
import { lambdaHandler, withTimeout } from "../lambda-utils";
import { BrowserName, BROWSERS } from "../browser/browsers";

const judgeOptsShape = z.object({
  puzzleSource: z.string(),
  puzzleName: z.string(),
  solution: z.string(),
});

export type JudgeOpts = z.TypeOf<typeof judgeOptsShape>;

interface JudgeResult {
  passed: boolean;
  value?: string;
  error?: string;
}

export const handler = lambdaHandler(judgeOptsShape, async (opts) => {
  console.log("==== opts", opts);

  const browserName = process.env["BROWSER_NAME"] as BrowserName | undefined;
  if (!browserName || !(browserName in BROWSERS))
    throw new Error(
      `Invalid BROWSER_NAME environment variable: ${browserName}`
    );
  const browserVersion = process.env["BROWSER_VERSION"];
  if (!browserVersion)
    throw new Error(
      `Invalid BROWSER_VERSION environment variable: ${browserVersion}`
    );

  // Trick tools like geckodriver into using a writable home directory
  process.env["HOME"] = "/tmp";

  const browser = new BROWSERS[browserName](browserVersion);
  return judge(opts, browser);
});

const judge = async (opts: JudgeOpts, browser: Browser) => {
  await withTimeout("browserStart", 60_000, () => browser.start());
  const result = await withTimeout("runSolution", 60_000, async () =>
    browser.execute<JudgeResult>(
      `return (${evaluateSolution.toString()})(${JSON.stringify(opts)})`
    )
  );
  return {
    numChars: opts.solution.length,
    ...result,
  };
};

/**
 * Note: this function is not used within the node app itself. Its JS source is
 * fetched as a string to be executed within the browser. Since this code will
 * be run inside many different browsers -- including very old ones -- it should
 * use only old and widely compatible JavaScript features.
 *
 * Comments on design:
 * - User code is executed in its own dynamic `Function` so that it does not
 * have any of the other variables here available in its scope to mess with
 * - All built-in functions used after user code runs need to be saved to a
 * local variable since they could be changed (eg. `JSON.stringify = ...`).
 * - The result of the user code is only saved by the first call to `callPuzzle`
 * so that we don't need a return in the user code (which could be bypassed with
 * injection attacks).
 * - No using `"value" in result` because `Object.prototype` may have been
 * manipulated by user code.
 */
function evaluateSolution(opts: JudgeOpts): JudgeResult {
  var jsonStringify = JSON.stringify;
  var toString = String;
  function stringify(value: unknown) {
    try {
      return jsonStringify(value);
    } catch {
      return toString(value);
    }
  }

  var puzzle: (...args: unknown[]) => unknown;
  function setPuzzle(fn: (...args: unknown[]) => unknown) {
    if (!puzzle) puzzle = fn;
  }

  var value: unknown;
  var isCallerReturned = false;
  function callPuzzle() {
    if (isCallerReturned) return undefined;
    isCallerReturned = true;
    return function () {
      value = puzzle.apply(undefined, arguments as unknown as unknown[]);
    };
  }

  try {
    var userCode = new Function(
      "setPuzzle",
      "callPuzzle",
      [
        opts.puzzleSource,
        ";setPuzzle(" + opts.puzzleName + ");",
        "callPuzzle()(" + opts.solution + ");",
      ].join("\n")
    );
    userCode(setPuzzle, callPuzzle);
    return { passed: value === true, value: stringify(value) };
  } catch (err) {
    return { passed: false, error: stringify(err) };
  }
}
