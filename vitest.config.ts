import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["src-tauri/**", "node_modules/**"],
    testTimeout: 15_000,
    // Separate integration tests by file name pattern
    sequence: {
      shuffle: false,
    },
  },
});
