import { createRequire } from "node:module";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

const _require = createRequire(import.meta.url);
const _crPkgPath = _require.resolve(
  "@midnight-ntwrk/compact-runtime/package.json",
);
const _crNodeModules = path.dirname(path.dirname(path.dirname(_crPkgPath)));
const onchainRuntimeBrowserPath = path.join(
  _crNodeModules,
  "@midnight-ntwrk",
  "onchain-runtime-v3",
  "midnight_onchain_runtime_wasm.js",
);

function onchainRuntimeV3ShimPlugin(): Plugin {
  return {
    name: "onchain-runtime-v3-browser-shim",
    enforce: "pre",
    resolveId(id) {
      if (id === "@midnight-ntwrk/onchain-runtime-v3") {
        return onchainRuntimeBrowserPath;
      }
      return undefined;
    },
  };
}

export default defineConfig({
  plugins: [onchainRuntimeV3ShimPlugin(), wasm(), react()],
  define: {
    global: "globalThis",
  },
  build: {
    target: "esnext",
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
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
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "object-inspect",
      "@midnight-ntwrk/compact-runtime",
    ],
    exclude: [
      "@midnight-ntwrk/onchain-runtime",
      "@midnight-ntwrk/onchain-runtime-v3",
    ],
  },
});
