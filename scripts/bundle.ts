import { relative } from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import esbuild, { BuildResult } from "esbuild";
import {
  DIST_BUNDLES_DIR,
  ENDPOINTS_DIR,
  NODE_VERSION,
} from "@jspuzzles/infrastructure";
import { endpoints, Endpoint, Endpoints } from "../packages/backend/src";

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
    banner: {
      // Fixes esbuild issue with CommonJS modules
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
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

  const build = (eps: Endpoints) => {
    for (const ep of Object.values(eps)) {
      if (ep instanceof Endpoint) {
        const outfile = `${ep.relativePath.replace(/\.ts$/, "")}/index`;
        entryPoints[outfile] = ep.path;
      } else {
        build(ep);
      }
    }
  };
  build(endpoints);

  return entryPoints;
};

if (fileURLToPath(import.meta.url) === process.argv[1]) await bundle();
