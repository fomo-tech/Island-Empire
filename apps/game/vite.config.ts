import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
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
    host: "127.0.0.1",
    port: 4173,
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
