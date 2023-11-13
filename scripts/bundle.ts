import path, { relative } from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import esbuild, { BuildResult } from "esbuild";
import {
  DIST_BUNDLES_DIR,
  JUDGE_ENDPOINT,
  REPO_ROOT,
} from "../packages/common-node/src/index.js";

const NODE_VERSION = readFileSync(
  path.join(REPO_ROOT, ".nvmrc"),
  "utf8",
).trim();

export const bundle = async (
  watchCallback?: (result: BuildResult) => Promise<void>,
) => {
  console.log(`Cleaning ${relative(process.cwd(), DIST_BUNDLES_DIR)}...`);
  await fs.rm(DIST_BUNDLES_DIR, { recursive: true, force: true });

  const ctx = await esbuild.context({
    outdir: DIST_BUNDLES_DIR,
    entryPoints: {
      "judge/index": JUDGE_ENDPOINT,
    },
    format: "esm",
    outExtension: { ".js": ".mjs" },
    platform: "node",
    target: `node${NODE_VERSION}`,
    sourcemap: "external",
    bundle: true,
    plugins: [
      {
        name: "onBuildEndCallback",
        setup: (build) => watchCallback && build.onEnd(watchCallback),
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

if (fileURLToPath(import.meta.url) === process.argv[1]) await bundle();
