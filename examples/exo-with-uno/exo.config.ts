import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "UnoCSS Extension Template",
  version: "0.0.1",
  manifest_version: 3,
  description: "React + UnoCSS template: popup, options, content, background",
  permissions: ["storage", "activeTab"],
  action: {
    default_popup: "popup/index.html"
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
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
});
