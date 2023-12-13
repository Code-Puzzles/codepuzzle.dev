import { Transform, TransformCallback } from "node:stream";
import {
  DEV_FRONTEND_BASE_URL,
  DOCKER_JUDGE_NAME,
  DOCKER_LS_NAME,
  DOCKER_NET_NAME,
  LOG_PREFIX,
} from "@jspuzzles/common";
import { $, ExecaChildProcess } from "execa";
import chalk from "chalk";
import {
  DIST_BUNDLES_DIR,
  REPO_ROOT,
  BROWSER_CONFIGS,
} from "@jspuzzles/infrastructure";
import { prefixProcessOutput } from "../utils";

// NOTE: set this to true to have an interactive shell in the built image
const interactive = process.argv.includes("--interactive");

const $$ = $({
  cwd: REPO_ROOT,
  env: {
    ...process.env,
    DOCKER_BUILDKIT: "0",
  },
});

const buildImage = async () => {
  console.log("Building docker image...");
  const version = "119.0";
  const buildArgs = Object.entries(
    BROWSER_CONFIGS.firefox.dockerBuildArgs(version),
  ).flatMap(([key, value]) => ["--build-arg", `${key}=${value}`]);
  const firefoxDockerfile = BROWSER_CONFIGS.firefox.dockerfilePath(version);
  await $$({
    stdio: "inherit",
  })`docker build ${[
    `--tag=${DOCKER_JUDGE_NAME}`,
    "--platform=linux/amd64",
    `--file=${firefoxDockerfile}`,
    ...buildArgs,
    ".",
  ]}`;
};

const runContainer = () => {
  console.log("Running...");

  const finalArgs = interactive
    ? [`--interactive`, `--tty`, `--entrypoint=/bin/bash`, DOCKER_JUDGE_NAME]
    : ["--entrypoint=/dev-loop.sh", DOCKER_JUDGE_NAME];

  const envVars = {
    AWS_ENDPOINT_URL: `http://${DOCKER_LS_NAME}:4566`,
    AWS_REGION: "us-east-1",
    AWS_ACCESS_KEY_ID: "test",
    AWS_SECRET_ACCESS_KEY: "test",
    FRONTEND_ORIGIN: DEV_FRONTEND_BASE_URL,
    IS_DEV: "true",
  };

  const proc = $$({
    reject: false,
    stdio: interactive ? "inherit" : "pipe",
  })`docker run ${[
    "--platform=linux/amd64",
    "--publish=9000:8080",
    `--net=${DOCKER_NET_NAME}`,
    "--rm",
    `--name=${DOCKER_JUDGE_NAME}`,
    `-v=${DIST_BUNDLES_DIR}/judge:/var/task`,
    ...Object.entries(envVars).flatMap(([name, value]) => [
      "--env",
      `${name}=${value}`,
    ]),
    ...finalArgs,
  ]}`;

  if (!interactive) {
    const stdoutStream = new JudgeOutputFormatter();
    proc.stdout?.pipe(stdoutStream);
    const stderrStream = new JudgeOutputFormatter();
    proc.stderr?.pipe(stderrStream);
    prefixProcessOutput(
      { stdout: stdoutStream, stderr: stderrStream },
      "[judge] ",
      "yellow",
    );
  }

  return proc;
};

export class JudgeOutputFormatter extends Transform {
  override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    chunk
      .toString()
      .split(/\r?\n/)
      .forEach((line) => {
        line = line.trim();
        if (line.length) {
          this.push(
            `${line
              // sometimes geckodriver emits ascii control characters which messes up the output
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
              // also collapse all whitespace down into a single space - easier to read
              .replace(/\s\s+/g, " ")}\n`
              // and finally highlight output from our lambda so it's easier to find
              .replace(new RegExp(`\s*${LOG_PREFIX}\s*(.+)`), (_, $1) =>
                chalk.bold.cyan(`${$1}`),
              ),
          );
        }
      });
    callback();
  }
}

let proc: ExecaChildProcess | null = null;
export const judgeDevLoop = async () => {
  if (!proc) {
    await buildImage();
    proc = runContainer();

    if (interactive) {
      proc.on("exit", () => process.exit(0));
    }
  }

  return true;
};
