/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      interfaces: resolve(__dirname, "src/interfaces.ts"),
    },
  },
  server: {
    host: "0.0.0.0", // Allows access from other devices (docker) on the network
    port: 3000,
    proxy: {
      "/api": {
        target: "http://app:8000", 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./__tests__/setup.ts",
  },
});
