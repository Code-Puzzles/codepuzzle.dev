import readline from "node:readline";
import { Writable } from "node:stream";
import path from "node:path";
import pulumi from "@pulumi/pulumi";
import { $ } from "execa";
import chalk from "chalk";
import { INFRASTRUCTURE_DIR, buildProgram } from "@jspuzzles/infrastructure";
import { bundle } from "../bundle.js";
import { judgeDevLoop } from "./judge.js";
import { createPrefixedOutputStream, prefixProcessOutput } from "../utils.js";

// TODO: Better log prefixes
// TODO: Tail cloudwatch logs from localstack to see lambda logs
// TODO: Reload backend lambdas on change
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

const localstack = $({
  cwd: INFRASTRUCTURE_DIR,
  stdio: ["ignore", "pipe", "pipe"],
})`docker run ${[
  "--rm",
  "--name",
  "js-puzzles-localstack",
  "-p",
  "127.0.0.1:4566:4566",
  "-p",
  "127.0.0.1:4510-4559:4510-4559",
  "-e",
  "DOCKER_HOST=unix:///var/run/docker.sock",
  "-v",
  `${path.join(INFRASTRUCTURE_DIR, ".localstack")}:/var/lib/localstack`,
  "-v",
  "/var/run/docker.sock:/var/run/docker.sock",
  "localstack/localstack",
]}`;
prefixProcessOutput(localstack, "[ls] ", "green");

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
    `curl http://${
      result.outputs.restApiId.value
    }.execute-api.localhost.localstack.cloud:4566/${
      result.outputs.stageName.value
    }/healthcheck -H 'Content-Type: application/json' -d '${JSON.stringify(
      {},
    )}'`,
  ),
);
