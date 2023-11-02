import util from "node:util";
import path from "node:path";
import { Builder, WebDriver } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox";

type BrowserType = "firefox";

const withTimeout = <T>(
  operationName: string,
  ms: number,
  func: () => Promise<T>
) =>
  new Promise<T>((resolve, reject) => {
    console.log("Operation:", operationName);
    console.time(operationName);
    const timeout = setTimeout(
      () => reject(new Error(`Operation timed out: ${operationName}`)),
      ms
    );
    func()
      .then(resolve, reject)
      .finally(() => {
        clearTimeout(timeout);
        console.timeEnd(operationName);
      });
  });

declare global {
  var browserDriver: WebDriver | undefined;
}

const startBrowser = async (type: BrowserType, isDev: boolean) => {
  if (!global.browserDriver) {
    switch (type) {
      case "firefox": {
        global.browserDriver = await new Builder()
          .forBrowser(type)
          .setFirefoxOptions(getFirefoxOpts(isDev))
          .build();
        break;
      }
    }
  }
  return global.browserDriver;
};

const getFirefoxOpts = (isDev: boolean) => {
  const opts = new firefox.Options().headless();
  return isDev
    ? opts
    : opts.setBinary(
        path.join(__dirname, ".browser", "firefox", "firefox-bin")
      );
};

export interface JudgeOpts {
  puzzleSource: string;
  puzzleName: string;
  solution: string;
}

export const judge = async (opts: JudgeOpts) => {
  const driver = await withTimeout("startBrowser", 20_000, () =>
    startBrowser("firefox", true)
  );
  try {
    const result: { passed: boolean; value?: string; err?: string } =
      await withTimeout("runSolution", 2_000, async () =>
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
