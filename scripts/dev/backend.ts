import readline from "node:readline";
import path from "node:path";
import pulumi from "@pulumi/pulumi";
import { $ } from "execa";
import chalk from "chalk";
import { INFRASTRUCTURE_DIR, buildProgram } from "@jspuzzles/infrastructure";
import { bundle } from "../bundle.js";
import { judgeDevLoop } from "./judge.js";
import {
  createPrefixedOutputStream,
  localstackLogCleaner,
  prefixProcessOutput,
} from "../utils.js";
import { DOCKER_LS_NAME, DOCKER_NET_NAME } from "@jspuzzles/common";

// TODO: Store prod pulumi state in private repo or s3

await bundle(judgeDevLoop);

process.env["PULUMI_CONFIG_PASSPHRASE"] = "";
const pulumiLogin = $({ cwd: INFRASTRUCTURE_DIR })`pulumi login file://.`;
prefixProcessOutput(pulumiLogin, "[pul] ", "blue");
await pulumiLogin;

const stack = await pulumi.automation.LocalWorkspace.createOrSelectStack(
  {
    projectName: "JS-Puzzles",
    stackName: "local",
    program: async () => buildProgram(true),
  },
  { workDir: INFRASTRUCTURE_DIR },
);

// Clear stack state
await stack.cancel();
await stack.importStack({
  version: 3,
  deployment: {
    manifest: { time: "0001-01-01T00:00:00Z", magic: "", version: "" },
  },
});

// remove any pre-existing containers
await $`docker rm --force ${DOCKER_LS_NAME}`;

// create docker network if it's not already created
await $`docker network inspect ${DOCKER_NET_NAME}`.catch(
  () => $`docker network create ${DOCKER_NET_NAME}`,
);

const localstack = $({
  cwd: INFRASTRUCTURE_DIR,
  stdio: ["ignore", "pipe", "pipe"],
})`docker run ${[
  `--net=${DOCKER_NET_NAME}`,
  "--rm",
  `--name=${DOCKER_LS_NAME}`,
  "-p=127.0.0.1:4566:4566",
  "-p=127.0.0.1:4510-4559:4510-4559",
  "-e=DOCKER_HOST=unix:///var/run/docker.sock",
  "-eDEBUG=1",
  `-v=${path.join(INFRASTRUCTURE_DIR, ".localstack")}:/var/lib/localstack`,
  "-v=/var/run/docker.sock:/var/run/docker.sock",
  "localstack/localstack",
]}`;
prefixProcessOutput(
  {
    stdout: localstack.stdout?.pipe(localstackLogCleaner()),
    stderr: localstack.stderr?.pipe(localstackLogCleaner()),
  },
  "[ls] ",
  "green",
);

localstack.then((result) => {
  console.error("Localstack has unexpectedly exited");
  process.exit(result.exitCode || 1);
});
localstack.catch((err) => {
  console.error(String(err));
  process.exit(err.exitCode || 1);
});

const rl = readline.createInterface(localstack.stdout!, process.stdout);
await new Promise<void>((resolve) => {
  rl.on("line", (line) => {
    if (line.includes("Ready.")) resolve();
  });
});

const stackUpStream = createPrefixedOutputStream(chalk.blue("[pul] "));
const result = await stack.up({
  color: "auto",
  onOutput: (chunk) => stackUpStream.write(chunk),
});

console.log(chalk.green("Backend is now set up and running!"));
console.log("\nCommand to test local backend:");
console.log(
  chalk.gray(
    `curl ${
      result.outputs.url.value
    }/healthcheck -H 'Content-Type: application/json' -d '${JSON.stringify(
      {},
    )}'`,
  ),
);
