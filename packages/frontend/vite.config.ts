import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte({
      preprocess: [sveltePreprocess({ typescript: true })],
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:9000",
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
