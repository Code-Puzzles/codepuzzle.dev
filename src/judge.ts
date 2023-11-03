import util from "node:util";
import { withTimeout } from "./lambda-utils";
import { Browser } from "./browser/types";

export interface JudgeOpts {
  puzzleSource: string;
  puzzleName: string;
  solution: string;
}

export const judge = async (opts: JudgeOpts, browser: Browser) => {
  await withTimeout("browserStart", 90_000, () => browser.start());
  const result: { passed: boolean; value?: string; err?: string } =
    await withTimeout("runSolution", 10_000, async () =>
      browser.execute<{ passed: boolean; value: string }>(
        [
          `return (${computeResult.toString()})()((() => {`,
          opts.puzzleSource,
          `return ${opts.puzzleName}(${opts.solution});`,
          "})())",
        ].join("\n\n")
      )
    ).catch((err) => ({ passed: false, err: util.inspect(err) }));
  return {
    numChars: opts.solution.length,
    ...result,
  };
};

const computeResult = () => {
  const jsonStringify = JSON.stringify;
  const toString = String;
  const stringify = (() => (value: unknown) => {
    try {
      return jsonStringify(value);
    } catch {
      return toString(value);
    }
  })();

  return (value: unknown) => ({
    passed: value === true,
    value: stringify(value),
  });
};
