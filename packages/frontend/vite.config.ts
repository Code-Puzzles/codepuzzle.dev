import { UserConfig, defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import {
  FRONTEND_BASE_URL,
  API_BASE_URL,
  DEV_FRONTEND_PORT,
  DEV_FRONTEND_HOST,
  DEV_FRONTEND_BASE_URL,
} from "../common/src/constants.js";
import { AddressInfo } from "net";

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  const isLocalDev = mode === "development";

  return {
    base: FRONTEND_BASE_URL,
    define: {
      IS_LOCAL_DEV: JSON.stringify(isLocalDev),
      API_BASE_URL: JSON.stringify(isLocalDev ? "/stage" : API_BASE_URL),
      MOCK_LOGIN: JSON.stringify(isLocalDev && !process.env["UNMOCK_LOGIN"]),
      GITHUB_OAUTH_CLIENT_ID: JSON.stringify(
        process.env["GITHUB_OAUTH_CLIENT_ID"] ?? "",
      ),
    },
    server: {
      port: DEV_FRONTEND_PORT,
      host: DEV_FRONTEND_HOST,
      proxy: {
        "/stage": {
          target:
            "http://api.execute-api.localhost.localstack.cloud:4566/stage",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/stage/, ""),
        },
      },
    },
    plugins: [
      svelte({
        preprocess: [sveltePreprocess({ typescript: true })],
      }),
      {
        name: "check-server-address",
        configureServer: ({ httpServer }) => {
          if (!httpServer) throw new Error("no server from vite");
          httpServer.on("listening", () => {
            const addr = httpServer.address() as AddressInfo;
            if (addr.port != DEV_FRONTEND_PORT) {
              throw new Error(
                `Local development only works on: ${DEV_FRONTEND_BASE_URL}, got: ${JSON.stringify(
                  addr,
                )}`,
              );
            }
          });
        },
      },
    ],
  };
});
