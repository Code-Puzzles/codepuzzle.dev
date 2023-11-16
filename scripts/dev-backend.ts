import { Readable } from "node:stream";
import { bundle } from "./bundle.js";
import { BROWSER_CONFIGS } from "../packages/judge/src/constants.js";
import { DIST_BUNDLES_DIR, LOG_PREFIX, REPO_ROOT } from "@rttw/common-node";
import { $, ExecaChildProcess, Options } from "execa";
import chalk from "chalk";

// NOTE: set this to true to have an interactive shell in the built image
const interactive = process.argv.includes("--interactive");
const imageName = "rttw-judge-dev";

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
  })`docker build --tag ${imageName} --platform linux/amd64 --file ${firefoxDockerfile} ${buildArgs} .`;
};

const runContainer = () => {
  console.log("Running...");

  const mount = `${DIST_BUNDLES_DIR}/judge:/var/task`;
  const finalArgs = interactive
    ? [`--interactive`, `--tty`, `--entrypoint=/bin/bash`, imageName]
    : ["--entrypoint=/dev-loop.sh", imageName];

  const proc = $$({
    reject: false,
    stdio: interactive ? "inherit" : "pipe",
  })`docker run --rm --name ${imageName} -v ${mount} --platform linux/amd64 --publish 9000:8080 ${finalArgs}`;

  if (!interactive) {
    logStream(chalk.yellow("[stdout]"), proc.stdout!);
    logStream(chalk.red("[stderr]"), proc.stderr!);
  }

  return proc;
};

const logStream = (prefix: string, stream: Readable) => {
  stream.setEncoding("utf-8");
  stream.on("data", (chunk: string) =>
    chunk.split(/\r?\n/).forEach((line) => {
      line = line.trim();
      if (line.length) {
        process.stderr.write(
          `${prefix}: ${line
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
    }),
  );
};

let proc: ExecaChildProcess | null = null;
const devLoop = async () => {
  if (!proc) {
    await buildImage();
    proc = runContainer();

    if (interactive) {
      proc.on("exit", () => process.exit(0));
    }
  }

  return true;
};

await bundle(devLoop);
