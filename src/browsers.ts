import fs from "fs/promises";
import path from "node:path";
import https from "node:https";
import { IncomingMessage } from "node:http";
import bz2 from "unbzip2-stream";
import tar from "tar-fs";
import { pipeline } from "stream/promises";
import { Builder } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox";

export abstract class Browser {
  constructor(public version?: string) {}
  abstract install(): Promise<void>;
  abstract getWebdriverOptions(builder: Builder): Builder;
}

export class FirefoxBrowser extends Browser {
  static dir = path.resolve("/tmp", "browser", "firefox");

  async install() {
    if (!this.version) return;
    await downloadAndExtract(
      `https://download-installer.cdn.mozilla.net/pub/firefox/releases/${this.version}/linux-x86_64/en-US/firefox-${this.version}.tar.bz2`,
      FirefoxBrowser.dir
    );
  }

  getWebdriverOptions(builder: Builder) {
    const opts = new firefox.Options().headless();
    const optsWithBinary = this.version
      ? opts.setBinary(path.join(FirefoxBrowser.dir, "firefox", "firefox-bin"))
      : opts;
    return builder.forBrowser("firefox").setFirefoxOptions(optsWithBinary);
  }
}

export const BROWSERS = {
  firefox: FirefoxBrowser,
} satisfies Record<string, new (version?: string) => Browser>;

export type BrowserName = keyof typeof BROWSERS;

const downloadAndExtract = (url: string, dir: string) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const dirExists = await fs.stat(dir, {}).then(
        () => true,
        () => false
      );
      if (dirExists) {
        console.log("Already downloaded");
        return;
      }

      console.log("Downloading...");

      const res = await new Promise<IncomingMessage>((resolve, reject) => {
        const req = https
          .get(url, (response) => {
            if (response.statusCode! >= 200 && response.statusCode! < 300) {
              resolve(response);
            } else {
              reject(
                new Error(`Request failed with status: ${response.statusCode}`)
              );
            }
          })
          .on("error", reject);

        req.setTimeout(5_000, () => {
          req.destroy();
          reject(new Error("Request connection timed out"));
        });
      });

      console.log("Download connected");

      const totalSize = res.headers["content-length"]
        ? parseInt(res.headers["content-length"], 10)
        : undefined;
      if (totalSize) {
        let downloadedBytes = 0;

        res.on("data", (chunk) => {
          downloadedBytes += chunk.length;
        });

        const interval = setInterval(() => {
          const progress = (downloadedBytes / totalSize) * 100;
          console.log(`Download progress: ${progress.toFixed(2)}%`);
        }, 1_000);

        res.on("close", () => clearInterval(interval));
      }

      res.on("end", () => console.log("Download complete!"));

      setTimeout(() => res.destroy(new Error("Download timed out")), 80_000);

      await pipeline(res, bz2(), tar.extract(dir));

      console.log("Extraction complete!");

      resolve();
    } catch (err) {
      reject(err);
    }
  });
