import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Content UI (React + Tailwind)",
  version: "0.0.1",
  manifest_version: 3,
  description: "Content script UI with defineContentUI + mountContentUI + React + Tailwind CSS",
  permissions: ["activeTab"],
  action: {
    default_popup: "popup/index.html",
  },
  background: { service_worker: "background/index.js" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["[exo.content]"],
      css: ["[exo.content]"],
    },
  ],
};

export default defineConfig({
  outDir: "dist",
  manifest: { chromium: manifest, firefox: manifest },
  plugins: [pluginReact()],
});
