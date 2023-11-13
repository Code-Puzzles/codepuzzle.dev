import fs from "node:fs/promises";
import path from "node:path";
import { ChildProcess, spawn } from "node:child_process";
import { promisify } from "node:util";
import { Browser } from "./types";

const sleep = promisify(setTimeout);

const GECKODRIVER_HOST = "127.0.0.1";
const GECKODRIVER_PORT = 4444;

export class FirefoxBrowser extends Browser {
  dir = path.resolve("/tmp/browser");
  baseUrl = `http://${GECKODRIVER_HOST}:${GECKODRIVER_PORT}`;
  geckodriverProc?: ChildProcess;
  sessionId?: string;

  async start() {
    if (this.geckodriverProc?.exitCode !== null) {
      const profileRoot = path.resolve("/tmp/profile");
      await fs.mkdir(profileRoot, { recursive: true });

      this.geckodriverProc = spawn(
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

      if (!this.geckodriverProc || this.geckodriverProc?.exitCode !== null)
        throw new Error(
          `Geckodriver is not running${
            this.geckodriverProc?.exitCode
              ? ` (exit code: ${this.geckodriverProc?.exitCode})`
              : ""
          }`,
        );

      try {
        const res = await fetch(`${this.baseUrl}/status`, {
          method: "GET",
        });
        const data = (await res.json()) as { value: { ready: boolean } };
        if (data.value.ready === true) break;
      } catch {}

      await sleep(200);
    }

    console.log("Geckodriver ready");
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
    console.log("=== sessionData", sessionData);
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
    this.geckodriverProc?.kill();
  }
}
