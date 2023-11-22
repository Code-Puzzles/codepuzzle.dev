import path, { relative } from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import esbuild, { BuildResult } from "esbuild";
import {
  DIST_BUNDLES_DIR,
  ENDPOINTS_DIR,
  NODE_VERSION,
} from "@jspuzzles/infrastructure";

export const bundle = async (
  watchCallback?: (result: BuildResult) => Promise<boolean>,
) => {
  console.log(`Cleaning ${relative(process.cwd(), DIST_BUNDLES_DIR)}...`);
  await fs.rm(DIST_BUNDLES_DIR, { recursive: true, force: true });

  const ctx = await esbuild.context({
    outdir: DIST_BUNDLES_DIR,
    entryPoints: await entryPointsFromDir(ENDPOINTS_DIR),
    format: "esm",
    outExtension: { ".js": ".mjs" },
    platform: "node",
    target: `node${NODE_VERSION}`,
    sourcemap: "external",
    bundle: true,
    plugins: [
      {
        name: "onBuildEndCallback",
        setup(build) {
          if (!watchCallback) return;
          build.onEnd(async (result) => {
            console.log("Rebuild finished");
            const shouldContinue = await watchCallback(result);
            if (!shouldContinue) await ctx.dispose();
          });
        },
      },
    ],
  });

  console.log("Building bundles...");
  if (watchCallback) {
    console.log("Watching for changes...");
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
};

const entryPointsFromDir = async (dir: string) => {
  const entryPoints: Record<string, string> = {};

  const visitDir = async (relativeDir: string) => {
    const entries = await fs.readdir(path.join(dir, relativeDir), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await visitDir(path.join(relativeDir, entry.name));
      } else if (entry.isFile()) {
        entryPoints[
          path.posix.join(relativeDir, path.parse(entry.name).name, "index")
        ] = path.join(entry.path, entry.name);
      }
    }
  };
  await visitDir("");

  return entryPoints;
};

if (fileURLToPath(import.meta.url) === process.argv[1]) await bundle();
