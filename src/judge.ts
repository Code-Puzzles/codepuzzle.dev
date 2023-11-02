import util from "node:util";
import { Builder, WebDriver } from "selenium-webdriver";
import { withTimeout } from "./lambda-utils";
import { Browser } from "./browsers";

declare global {
  var browserDriver: WebDriver | undefined;
}

const startBrowser = async (browser: Browser) => {
  if (!global.browserDriver) {
    global.browserDriver = await browser
      .getWebdriverOptions(new Builder())
      .build();
  }
  return global.browserDriver;
};

export interface JudgeOpts {
  puzzleSource: string;
  puzzleName: string;
  solution: string;
}

export const judge = async (opts: JudgeOpts, browser: Browser) => {
  const driver = await withTimeout("startBrowser", 90_000, () =>
    startBrowser(browser)
  );
  try {
    const result: { passed: boolean; value?: string; err?: string } =
      await withTimeout("runSolution", 10_000, async () =>
        driver.executeScript<{ passed: boolean; value: string }>(
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
  } finally {
    await driver.close();
  }
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
