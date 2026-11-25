import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm(), react()],
  build: {
    target: "esnext",
  },
  esbuild: {
    target: "esnext",
  },
  css: {
    postcss: {},
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
    exclude: [
      "@midnight-ntwrk/compact-runtime",
      "@midnight-ntwrk/onchain-runtime",
      "@midnight-ntwrk/onchain-runtime-v2",
    ],
  },
});
