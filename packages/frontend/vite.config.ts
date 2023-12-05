import { UserConfig, defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import { JUDGE_DOMAIN } from "../common/src/constants.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  const isLocalDev = mode === "development";
  const API_BASE_URL = isLocalDev
    ? "http://api.execute-api.localhost.localstack.cloud:4566/stage"
    : `https://${JUDGE_DOMAIN}/stage`;

  return {
    base: "https://js-puzzles.github.io/JS-Puzzles/",
    define: {
      IS_LOCAL_DEV: isLocalDev,
      API_BASE_URL: JSON.stringify(API_BASE_URL),
      MOCK_LOGIN: JSON.stringify(isLocalDev && !process.env["UNMOCK_LOGIN"]),
    },
    plugins: [
      svelte({
        preprocess: [sveltePreprocess({ typescript: true })],
      }),
    ],
  };
});
