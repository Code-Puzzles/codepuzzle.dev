import { FirefoxBrowser } from "./firefox.js";
import { Browser } from "./types.js";

export const BROWSERS = {
  firefox: FirefoxBrowser,
} satisfies Record<string, new (version: string) => Browser>;

export type BrowserName = keyof typeof BROWSERS;
