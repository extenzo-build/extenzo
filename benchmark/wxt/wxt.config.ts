import { defineConfig } from "wxt";

export default defineConfig({
  // 避免 dev 时误用 dev/entrypoints，显式指定为项目根下的 entrypoints
  srcDir: ".",
  entrypointsDir: "entrypoints",
  manifest: {
    name: "Benchmark Recorder (WXT)",
    version: "0.0.1",
    description: "Record tab video, store in IndexedDB (max 5MB), React+Tailwind",
    permissions: ["storage", "activeTab", "tabs", "tabCapture", "offscreen"]
  },
});
