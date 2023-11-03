import path from "node:path";
import fs from "node:fs/promises";
import esbuild from "esbuild";
import { SpawnOptions, spawn } from "node:child_process";
import { BROWSER_FUNCS, LAMBDA_PLATFORM, NODE_VERSION } from "./constants";

interface PackageLock {
  packages: Record<string, { dependencies?: Record<string, string> }>;
}

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

export const build = async () => {
  console.log("Cleaning dist directory...");
  await fs.rm(distDir, { recursive: true, force: true });

  const entryPoints = Object.fromEntries(
    Object.entries(BROWSER_FUNCS).flatMap(([name, versions]) =>
      versions.map((version) => [
        `judge/${name}/${version}/index`,
        path.join(rootDir, "src", "endpoint.ts"),
      ])
    )
  );

  console.log("Building...");
  const copyImportedNodeModulesPlugin: esbuild.Plugin = {
    name: "copyImportedNodeModules",
    async setup(build) {
      const packageLock = JSON.parse(
        await fs.readFile(path.join(rootDir, "package-lock.json"), "utf8")
      ) as PackageLock;
      const tempPackageJson: { dependencies: Record<string, string> } = {
        dependencies: {},
      };
      const tempDir = path.join(distDir, "temp");
      const tempNodeModulesDir = path.join(tempDir, "node_modules");

      build.onResolve({ filter: /^[^./\\]/ }, (args) => {
        const moduleName = path.posix
          .normalize(args.path)
          .match(/^(?:@[^/]+\/)?[^/]+/)?.[0];
        if (!moduleName || !packageLock.packages[`node_modules/${moduleName}`])
          return undefined;

        tempPackageJson.dependencies[moduleName] = "*";
        return { external: true };
      });

      build.onEnd(async () => {
        console.log("Installing node modules using lambda platform...");

        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(
          path.join(tempDir, "package-lock.json"),
          JSON.stringify(packageLock, null, 2)
        );
        await fs.writeFile(
          path.join(tempDir, "package.json"),
          JSON.stringify(tempPackageJson, null, 2)
        );

        await run("docker", [
          "run",
          "--rm",
          "--platform",
          LAMBDA_PLATFORM,
          "-v",
          `${tempDir}:/usr/src/app`,
          "-v",
          `${tempDir}/npm-cache:/root/.npm`,
          "-w",
          "/usr/src/app",
          `node:${NODE_VERSION}`,
          "npm",
          "ci",
        ]);

        for (const entryPointOut of Object.keys(entryPoints)) {
          await fs.cp(
            tempNodeModulesDir,
            path.join(distDir, entryPointOut, "..", "node_modules"),
            { recursive: true }
          );
        }
      });
    },
  };
  await esbuild.build({
    outdir: distDir,
    entryPoints,
    platform: "node",
    target: `node${NODE_VERSION}`,
    sourcemap: "external",
    bundle: true,
    plugins: [copyImportedNodeModulesPlugin],
  });
};

const run = async (
  cmd: string,
  args: string[],
  opts: SpawnOptions = {}
): Promise<void> =>
  new Promise((resolve, reject) => {
    console.log("Running command:", cmd, args, opts);

    const childProcess = spawn(cmd, args, { stdio: "inherit", ...opts });

    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${cmd}" exited with code ${code}`));
      }
    });

    childProcess.on("error", reject);
  });

if (require.main === module)
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
