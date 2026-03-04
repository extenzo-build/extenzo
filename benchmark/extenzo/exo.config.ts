import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Benchmark Recorder (Extenzo)",
  version: "0.0.1",
  manifest_version: 3,
  description: "Record tab video, store in IndexedDB (max 5MB), React+Tailwind",
  permissions: [
    "storage",
    "activeTab",
    "tabs",
    "tabCapture",
    "offscreen",
  ],
  action: {
    default_icon: { 16: "icons/icon_16.png", 48: "icons/icon_48.png" },
  },
  content_scripts: [{ matches: ["<all_urls>"]}],
};

export default defineConfig({
  outDir: "video-recorder",
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()]
});
