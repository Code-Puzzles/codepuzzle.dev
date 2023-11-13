import path from "node:path";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import esbuild from "esbuild";
import {
  DIST_BUNDLES_DIR,
  JUDGE_ENDPOINT,
  REPO_ROOT,
} from "../packages/common/src";

const NODE_VERSION = readFileSync(
  path.join(REPO_ROOT, ".nvmrc"),
  "utf8",
).trim();

export const build = async () => {
  console.log("Cleaning dist directory...");
  await fs.rm(DIST_BUNDLES_DIR, { recursive: true, force: true });

  console.log("Building lambda...");
  await esbuild.build({
    outdir: DIST_BUNDLES_DIR,
    entryPoints: {
      "judge/index": JUDGE_ENDPOINT,
    },
    platform: "node",
    target: `node${NODE_VERSION}`,
    sourcemap: "external",
    bundle: true,
  });
};

if (require.main === module)
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
