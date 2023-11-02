import path from "node:path";
import fs from "node:fs";

export const LAMBDA_PLATFORM = "linux/amd64";

export const BROWSERS = {
  firefox119:
    "https://download-installer.cdn.mozilla.net/pub/firefox/releases/119.0/linux-x86_64/en-US/firefox-119.0.tar.bz2",
} satisfies Record<string, string>;

export const NODE_VERSION = fs
  .readFileSync(path.join(__dirname, "..", ".nvmrc"), "utf8")
  .trim();
