import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, "..", "..", "..");

export const DIST_BUNDLES_DIR = join(REPO_ROOT, "dist-bundles");
export const PACKAGES_DIR = join(REPO_ROOT, "packages");

export const JUDGE_DIR = join(PACKAGES_DIR, "judge");
export const INFRASTRUCTURE_DIR = join(PACKAGES_DIR, "infrastructure");

export const CONTAINERS_DIR = join(JUDGE_DIR, "containers");
export const JUDGE_ENDPOINT = join(JUDGE_DIR, "src", "judge.ts");
