import path from "node:path";
import fs from "node:fs/promises";
import esbuild from "esbuild";
import decompress from "decompress";
import { SpawnOptions, spawn } from "node:child_process";
import { BROWSERS, LAMBDA_PLATFORM, NODE_VERSION } from "./constants";

interface PackageLock {
  packages: Record<string, { dependencies?: Record<string, string> }>;
}

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

export const build = async () => {
  console.log("Cleaning dist directory...");
  await fs.rm(distDir, { recursive: true, force: true });

  const entryPoints: Record<string, string> = {};
  for (const [key, downloadUrl] of Object.entries(BROWSERS)) {
    const data = await downloadBrowser(key, downloadUrl);
    console.log(`Decompressing ${key}...`);
    await decompress(data, path.join(distDir, "judge", key, ".browser"));
    entryPoints[`judge/${key}/index`] = path.join(
      rootDir,
      "src",
      "endpoint.ts"
    );
  }

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
    target: "node20",
    sourcemap: "external",
    bundle: true,
    plugins: [copyImportedNodeModulesPlugin],
  });
};

const downloadBrowser = async (key: string, downloadUrl: string) => {
  const browserCacheDir = path.join(__dirname, "..", ".browsercache");
  const cacheFilePath = path.join(browserCacheDir, key);
  const cachedFile = await fs.readFile(cacheFilePath).catch(() => undefined);
  if (cachedFile) return cachedFile;

  console.log(`Downloading ${key}...`);
  const res = await fetch(downloadUrl);
  const data = await res.arrayBuffer();
  await fs.mkdir(browserCacheDir, { recursive: true });
  await fs.writeFile(cacheFilePath, new Uint8Array(data));
  return Buffer.from(data);
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
