import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://127.0.0.1:4000",
        ws: true,
      },
    },
    watch: {
      // Use polling so macOS file system events don't get missed
      usePolling: true,
      interval: 100,
    },
    hmr: {
      overlay: true,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
