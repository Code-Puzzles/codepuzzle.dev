import { z } from "zod";
import {
  JudgeResult,
  JudgeResultWithCount,
  LOG_PREFIX,
  puzzlesAsMap,
} from "@jspuzzles/common";
import { Browser } from "../browser/types.js";
import { lambdaHandler, withTimeout } from "../lambda-utils.js";
import { BrowserName, BROWSERS } from "../browser/browsers.js";

const judgeOptsShape = z.object({
  puzzleId: z.string(),
  solution: z.string(),
});
export type JudgeOpts = z.TypeOf<typeof judgeOptsShape>;

const evaluateOptsShape = judgeOptsShape.extend({
  puzzleName: z.string(),
});
export type EvaluateOpts = z.TypeOf<typeof evaluateOptsShape>;

export const handler = lambdaHandler(judgeOptsShape, async (opts) => {
  // TODO: monkey patch process.stdout/stderr, rather than having to manually use LOG_PREFIX here
  console.log(`${LOG_PREFIX} opts`, opts);

  const browserName = process.env["BROWSER_NAME"] as BrowserName | undefined;
  if (!browserName || !(browserName in BROWSERS))
    throw new Error(
      `${LOG_PREFIX} Invalid BROWSER_NAME environment variable: ${browserName}`,
    );
  const browserVersion = process.env["BROWSER_VERSION"];
  if (!browserVersion)
    throw new Error(
      `${LOG_PREFIX} Invalid BROWSER_VERSION environment variable: ${browserVersion}`,
    );

  // Trick tools like geckodriver into using a writable home directory
  process.env["HOME"] = "/tmp";

  const browser = new BROWSERS[browserName](browserVersion);
  const result = await judge(opts, browser);
  console.log(`${LOG_PREFIX} result`, result);
  return result;
});

const judge = async (
  opts: JudgeOpts,
  browser: Browser,
): Promise<JudgeResultWithCount> => {
  await withTimeout("browserStart", 60_000, () => browser.start());
  const puzzle = puzzlesAsMap[opts.puzzleId];
  if (!puzzle) throw new Error(`Puzzle not found: ${opts.puzzleId}`);
  const evalOpts: EvaluateOpts = { ...opts, puzzleName: puzzle.name };
  const result = await withTimeout("runSolution", 60_000, async () =>
    browser.execute<JudgeResult>(
      `return (${evaluateSolution.toString()})(${JSON.stringify(
        evalOpts,
      )}, ${JSON.stringify(puzzle.source)})`,
    ),
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
function evaluateSolution(
  opts: EvaluateOpts,
  puzzleSource: string,
): JudgeResult {
  var jsonStringify = JSON.stringify;
  var toString = String;
  function stringify(value: unknown) {
    try {
      if (value instanceof Error) return toString(value);
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
        puzzleSource,
        ";setPuzzle(" + opts.puzzleName + ");",
        "callPuzzle()(" + opts.solution + ");",
      ].join("\n"),
    );
    userCode(setPuzzle, callPuzzle);
    return { passed: value === true, value: stringify(value) };
  } catch (err) {
    return { passed: false, error: stringify(err) };
  }
}
