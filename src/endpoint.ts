import { z } from "zod";
import { JudgeOpts, judge } from "./judge";
import { lambdaHandler } from "./lambda-utils";
import { BrowserName, BROWSERS } from "./browser/browsers";

const judgeOptsShape: z.ZodType<JudgeOpts> = z.object({
  puzzleSource: z.string(),
  puzzleName: z.string(),
  solution: z.string(),
});

export const handler = lambdaHandler(judgeOptsShape, async (opts) => {
  console.log("==== opts", opts);
  console.log({ __dirname, tmpdir: require("node:os").tmpdir() });

  // Trick selenium into using /tmp for cache (only writable dir on lambda)
  process.env["HOME"] = "/tmp";

  const browserName = process.env["BROWSER_NAME"] as BrowserName | undefined;
  if (!browserName || !(browserName in BROWSERS))
    throw new Error(
      `Invalid BROWSER_NAME environment variable: ${browserName}`
    );
  const browser = new BROWSERS[browserName](process.env["BROWSER_VERSION"]);
  await browser.install();
  return judge(opts, browser);
});
