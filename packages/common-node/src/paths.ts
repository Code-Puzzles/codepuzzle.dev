import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.join(__dirname, "..", "..", "..");

export const DIST_BUNDLES_DIR = path.join(REPO_ROOT, "dist-bundles");
export const PACKAGES_DIR = path.join(REPO_ROOT, "packages");

export const JUDGE_DIR = path.join(PACKAGES_DIR, "judge");
export const INFRASTRUCTURE_DIR = path.join(PACKAGES_DIR, "infrastructure");
export const BACKEND_DIR = path.join(PACKAGES_DIR, "backend");

export const CONTAINERS_DIR = path.join(JUDGE_DIR, "containers");
export const JUDGE_ENDPOINT = path.join(JUDGE_DIR, "src", "judge.ts");

export const ENDPOINTS_DIR = path.join(BACKEND_DIR, "src", "endpoints");
