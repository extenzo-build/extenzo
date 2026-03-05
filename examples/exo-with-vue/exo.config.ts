import { defineConfig } from "extenzo";
import vue from "@extenzo/rsbuild-plugin-vue";

const manifest = {
  name: "Vue Extension Template",
  version: "0.0.1",
  manifest_version: 3,
  description: "Vue template with popup, options, content, background",
  permissions: ["storage", "activeTab"],
  action: {
    default_icon: { 16: "/icons/icon_16.png", 48: "/icons/icon_48.png" },
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
    },
  ],
};

export default defineConfig({
  outDir: "dist",
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [vue()]
});
