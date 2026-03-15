import { defineConfig } from "extenzo";

const manifest = {
  name: "Rstest Unit Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Extension with rstest unit tests",
  permissions: ["storage", "activeTab"],
  action: { default_popup: "popup/index.html" },
  background: { service_worker: "background/index.js" },
  content_scripts: [{ matches: ["<all_urls>"], js: ["content/index.js"] }],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
});
