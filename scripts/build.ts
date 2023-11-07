import path from "node:path";
import fs from "node:fs/promises";
import esbuild from "esbuild";
import { NODE_VERSION } from "./constants";

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const endpointsDir = path.join(__dirname, "..", "src", "endpoints");

export const build = async () => {
  console.log("Cleaning dist directory...");
  await fs.rm(distDir, { recursive: true, force: true });

  const endpointFiles = await fs.readdir(endpointsDir);
  const entryPoints = Object.fromEntries(
    endpointFiles.map((filename) => [
      `${path.parse(filename).name}/index`,
      path.join(endpointsDir, filename),
    ])
  );

  console.log("Building lambda...");
  await esbuild.build({
    outdir: distDir,
    entryPoints,
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
