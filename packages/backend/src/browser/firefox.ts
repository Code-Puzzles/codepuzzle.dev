import fs from "node:fs/promises";
import path from "node:path";
import { ChildProcess, spawn } from "node:child_process";
import { promisify } from "node:util";
import { Browser } from "./types.js";
import { LOG_PREFIX } from "@jspuzzles/common";

const sleep = promisify(setTimeout);

const GECKODRIVER_HOST = "127.0.0.1";
const GECKODRIVER_PORT = 4444;

export class FirefoxBrowser extends Browser {
  dir = path.resolve("/tmp/browser");
  baseUrl = `http://${GECKODRIVER_HOST}:${GECKODRIVER_PORT}`;
  sessionId?: string;

  // NOTE: static so each instance shares the same process (otherwise port
  // conflicts occur, and the same process isn't reused)
  static geckodriverProc?: ChildProcess;

  isRunning() {
    if (!FirefoxBrowser.geckodriverProc) return false;
    return (
      FirefoxBrowser.geckodriverProc.exitCode === null &&
      FirefoxBrowser.geckodriverProc.signalCode === null
    );
  }

  async ping() {
    try {
      const res = await fetch(`${this.baseUrl}/status`, {
        method: "GET",
      });
      const data = (await res.json()) as { value: { ready: boolean } };
      return data.value.ready === true;
    } catch {
      return false;
    }
  }

  async start() {
    if (!this.isRunning()) {
      const profileRoot = path.resolve("/tmp/profile");
      await fs.mkdir(profileRoot, { recursive: true });

      FirefoxBrowser.geckodriverProc = spawn(
        path.resolve("/opt/geckodriver"),
        [
          `--log=fatal`,
          `--host=${GECKODRIVER_HOST}`,
          `--port=${GECKODRIVER_PORT}`,
          `--profile-root=${profileRoot}`,
          `--binary=${path.resolve("/opt/firefox/firefox-bin")}`,
        ],
        { stdio: "inherit" },
      );
    }

    const geckodriverStartupTimeout = 5_000;
    const startTime = Date.now();
    while (true) {
      if (Date.now() > startTime + geckodriverStartupTimeout)
        throw new Error("Geckodriver startup timed out");

      if (!this.isRunning())
        throw new Error(
          `Geckodriver is not running${
            FirefoxBrowser.geckodriverProc?.exitCode
              ? ` (exit code: ${FirefoxBrowser.geckodriverProc?.exitCode})`
              : FirefoxBrowser.geckodriverProc?.signalCode
              ? ` (signal: ${FirefoxBrowser.geckodriverProc?.signalCode})`
              : ""
          }`,
        );

      if (await this.ping()) {
        break;
      }

      await sleep(200);
    }

    console.log(`${LOG_PREFIX} Geckodriver ready`);
  }

  async execute<T>(script: string) {
    const sessionResponse = await fetch(`${this.baseUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capabilities: {
          alwaysMatch: {
            browserName: "firefox",
            "moz:firefoxOptions": {
              args: ["-headless"],
            },
          },
        },
      }),
    });
    const sessionData = (await sessionResponse.json()) as {
      value: { sessionId: string };
    };
    this.sessionId = sessionData.value.sessionId;

    const scriptResponse = await fetch(
      `${this.baseUrl}/session/${this.sessionId}/execute/sync`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, args: [] }),
      },
    );
    const scriptData = (await scriptResponse.json()) as { value: T };
    const result = scriptData.value as T;

    await fetch(`${this.baseUrl}/session/${this.sessionId}`, {
      method: "DELETE",
    });

    return result;
  }

  async close() {
    FirefoxBrowser.geckodriverProc?.kill();
  }
}
