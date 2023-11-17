import path from "node:path";
import fs from "node:fs/promises";
import { REPO_ROOT } from "./paths.js";

export const NODE_VERSION = (
  await fs.readFile(path.join(REPO_ROOT, ".nvmrc"), "utf8")
).trim();
