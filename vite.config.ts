import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gatewayTarget = env.GATEWAY_TARGET || "http://127.0.0.1:8642";

  return {
    plugins: [tailwindcss(), react()],

    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
      // Proxy API requests to the Hermes Gateway
      proxy: {
        "/health": {
          target: gatewayTarget,
          changeOrigin: true,
        },
        "/api": {
          target: gatewayTarget,
          changeOrigin: true,
        },
        "/v1": {
          target: gatewayTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          overlay: resolve(__dirname, "overlay.html"),
        },
      },
    },
  };
});
