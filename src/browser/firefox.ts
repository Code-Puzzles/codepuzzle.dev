import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import { ChildProcessWithoutNullStreams } from "node:child_process";
import { IncomingMessage } from "node:http";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";
import bz2 from "unbzip2-stream";
import tar from "tar-fs";
import { Browser } from "./types";
import axios from "axios";

const sleep = promisify(setTimeout);

const GECKODRIVER_HOST = "127.0.0.1";
const GECKODRIVER_PORT = 4444;

// https://firefox-source-docs.mozilla.org/testing/geckodriver/Support.html
const GECKODRIVER_COMPATIBILITY: [
  minFirefoxMajorVersion: number,
  geckodriverVersion: string
][] = [
  [102, "0.33.0"],
  [91, "0.31.0"],
  [78, "0.30.0"],
  [60, "0.29.1"],
  [57, "0.25.0"],
  [55, "0.20.1"],
  [53, "0.18.0"],
  [52, "0.17.0"],
];

GECKODRIVER_COMPATIBILITY.sort(([a], [b]) => b - a);

export class FirefoxBrowser extends Browser {
  dir = path.resolve("/tmp/browser");
  baseUrl = `http://${GECKODRIVER_HOST}:${GECKODRIVER_PORT}`;
  geckodriverProc?: ChildProcessWithoutNullStreams;
  sessionId?: string;

  async install() {
    if (!this.version) return;
    await downloadAndExtract(
      `https://download-installer.cdn.mozilla.net/pub/firefox/releases/${this.version}/linux-x86_64/en-US/firefox-${this.version}.tar.bz2`,
      this.dir
    );
  }

  async start() {
    const cacheDir = path.resolve("/tmp/geckodriver");
    const profileRoot = path.resolve("/tmp/profile");
    if (this.version) {
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.mkdir(profileRoot, { recursive: true });
    }

    const geckodriver = await import("geckodriver");
    this.geckodriverProc = await geckodriver.start({
      host: GECKODRIVER_HOST,
      port: GECKODRIVER_PORT,
      ...(this.version
        ? {
            // TODO: Doesn't work for some reason
            // geckoDriverVersion: this.getCompatibleGeckodriverVersion(),
            cacheDir,
            profileRoot,
            binary: path.join(this.dir, "firefox", "firefox-bin"),
          }
        : {}),
    });
    this.geckodriverProc.stdout.pipe(process.stdout);
    this.geckodriverProc.stderr.pipe(process.stderr);

    const geckodriverStartupTimeout = 5_000;
    const startTime = Date.now();
    while (true) {
      if (Date.now() > startTime + geckodriverStartupTimeout)
        throw new Error("Geckodriver startup timed out");

      if (!this.geckodriverProc || this.geckodriverProc?.exitCode !== null)
        throw new Error(
          `Geckodriver is not running${
            this.geckodriverProc?.exitCode
              ? ` (exit code: ${this.geckodriverProc?.exitCode})`
              : ""
          }`
        );

      try {
        const res = await axios.get(`${this.baseUrl}/status`);
        if (res.data.value.ready === true) break;
      } catch {}

      await sleep(200);
    }

    console.log("Geckodriver ready");
  }

  getCompatibleGeckodriverVersion() {
    if (!this.version) return undefined;
    const firefoxMajorVersion = +this.version.split(".", 1)[0]!;
    const result = GECKODRIVER_COMPATIBILITY.find(
      ([minFirefoxVersion]) => firefoxMajorVersion >= minFirefoxVersion
    );
    return result?.[1];
  }

  async execute<T>(script: string) {
    const sessionResponse = await axios.post(`${this.baseUrl}/session`, {
      capabilities: {
        alwaysMatch: {
          browserName: "firefox",
          "moz:firefoxOptions": {
            args: ["-headless"],
          },
        },
      },
    });
    this.sessionId = sessionResponse.data.value.sessionId;

    const scriptResponse = await axios.post(
      `${this.baseUrl}/session/${this.sessionId}/execute/sync`,
      { script, args: [] }
    );
    const result = scriptResponse.data.value as T;

    await axios.delete(`${this.baseUrl}/session/${this.sessionId}`);

    return result;
  }

  async close() {
    this.geckodriverProc?.kill();
  }
}

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
          console.log(`Download progress: ${progress.toFixed(1)}%`);
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
