import path from "node:path";
import fs from "node:fs";
import { BrowserName } from "../src/browser/browsers";

export const LAMBDA_PLATFORM = "linux/amd64";

export const NODE_VERSION = fs
  .readFileSync(path.join(__dirname, "..", ".nvmrc"), "utf8")
  .trim();

export const BROWSER_FUNCS: Record<BrowserName, string[]> = {
  firefox: ["119.0"],
};
