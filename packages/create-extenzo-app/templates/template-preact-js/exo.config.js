import { defineConfig } from "extenzo";
import { pluginPreact } from "@rsbuild/plugin-preact";

const manifest = {
  name: "My Extension",
  version: "1.0.0",
  manifest_version: 3,
  description: "Browser extension built with extenzo",
  permissions: ["storage", "activeTab"],
  action: {
    default_popup: "popup/index.html",
    default_icon: { 16: "/icons/icon_16.png", 48: "/icons/icon_48.png" },
  },
  options_ui: { page: "options/index.html", open_in_tab: true },
  background: { service_worker: "background/index.js" },
  content_scripts: [
    { matches: ["<all_urls>"], js: ["content/index.js"] },
  ],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginPreact()],
});
