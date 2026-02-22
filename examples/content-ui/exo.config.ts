import { defineConfig } from "extenzo";

const manifest = {
  name: "Content UI Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Demonstrates defineContentUI and mountContentUI from @extenzo/utils",
  permissions: ["activeTab"],
  action: {
    default_popup: "popup/index.html",
  },
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
});
