import { UserConfig, defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import { JUDGE_BASE_URL } from "../common/src/constants.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  const isLocalDev = mode === "development";
  const API_BASE_URL = isLocalDev
    ? "http://api.execute-api.localhost.localstack.cloud:4566/stage"
    : `${JUDGE_BASE_URL}/stage`;

  return {
    base: "https://js-puzzles.github.io/JS-Puzzles/",
    define: {
      IS_LOCAL_DEV: JSON.stringify(isLocalDev),
      API_BASE_URL: JSON.stringify(API_BASE_URL),
      MOCK_LOGIN: JSON.stringify(isLocalDev && !process.env["UNMOCK_LOGIN"]),
      GITHUB_OAUTH_CLIENT_ID: JSON.stringify(
        process.env["GITHUB_OAUTH_CLIENT_ID"] ?? "",
      ),
    },
    plugins: [
      svelte({
        preprocess: [sveltePreprocess({ typescript: true })],
      }),
    ],
  };
});
