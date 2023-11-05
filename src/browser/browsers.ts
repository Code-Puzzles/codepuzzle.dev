import { FirefoxBrowser } from "./firefox";
import { Browser } from "./types";

export const BROWSERS = {
  firefox: FirefoxBrowser,
} satisfies Record<string, new (version: string) => Browser>;

export type BrowserName = keyof typeof BROWSERS;
