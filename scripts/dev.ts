import path from "node:path";
import { spawn, ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { APIGatewayProxyResult } from "aws-lambda";
import { build } from "./build";
import { JudgeOpts } from "../src/endpoints/judge";
import { BROWSER_CONFIGS } from "./constants";

const sleep = promisify(setTimeout);

const main = async () => {
  await build();

  console.log("Running...");
  const firefoxDockerfile = path.join(
    __dirname,
    "..",
    "containers",
    "firefox.Dockerfile"
  );

  await processPromise(
    spawn(
      "docker",
      [
        "build",
        "--tag",
        "rttw-judge-dev",
        "--platform",
        "linux/amd64",
        "--file",
        firefoxDockerfile,
        ...Object.entries(
          BROWSER_CONFIGS.firefox.dockerBuildArgs("119.0")
        ).flatMap(([key, value]) => ["--build-arg", `${key}=${value}`]),
        ".",
      ],
      {
        stdio: "inherit",
        cwd: path.join(__dirname, "..", "dist", "judge"),
        env: {
          ...process.env,
          DOCKER_BUILDKIT: "0",
        },
      }
    )
  );

  const proc = spawn(
    "docker",
    [
      "run",
      "--rm",
      "--name",
      "rttw-judge-dev",
      "--platform",
      "linux/amd64",
      "--publish",
      "9000:8080",
      // To manually inspect image:
      // "--interactive",
      // "--tty",
      // "--entrypoint",
      // "/bin/bash",
      "-v",
      `${path.join(__dirname, "..", "dist", "judge")}:/var/task`,
      "rttw-judge-dev",
    ],
    {
      stdio: "inherit",
      cwd: path.join(__dirname, "..", "dist", "judge"),
    }
  );

  const opts: JudgeOpts = {
    puzzleName: "id",
    puzzleSource: "function id(x) {\n  return x;\n}",
    solution: "!0",
  };

  await Promise.race([
    processPromise(proc),
    (async () => {
      await sleep(1000);
      console.log("=== Making request", opts);
      const res = await fetch(
        "http://localhost:9000/2015-03-31/functions/function/invocations",
        {
          method: "POST",
          body: JSON.stringify({ body: btoa(JSON.stringify(opts)) }),
        }
      );
      const data = (await res.json()) as APIGatewayProxyResult;
      console.log("=== data", data.statusCode, JSON.parse(data.body));
    })(),
  ]);

  proc.kill();
};

const processPromise = (proc: ChildProcess) =>
  new Promise<void>((resolve, reject) => {
    proc
      .on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Build failed with code: ${code}`))
      )
      .on("error", reject);
  });

main();
