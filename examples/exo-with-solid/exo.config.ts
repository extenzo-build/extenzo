import { defineConfig } from "extenzo";
import { pluginBabel } from "@rsbuild/plugin-babel";
import { pluginSolid } from "@rsbuild/plugin-solid";

const manifest = {
  name: "Solid Extension Template",
  version: "0.0.1",
  manifest_version: 3,
  description: "Solid template with popup, options, content, background",
  permissions: ["storage", "activeTab"],
  action: {
    default_popup: "popup/index.html",
    default_icon: { 16: "/icons/icon_16.png", 48: "/icons/icon_48.png" },
  },
  options_ui: { page: "options/index.html", open_in_tab: true },
  background: { service_worker: "background/index.js" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content/index.js"],
    },
  ],
};

export default defineConfig({
  outDir: "dist",
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginBabel({ include: /\.(?:jsx|tsx)$/ }), pluginSolid()],
});
