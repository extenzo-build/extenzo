import { defineConfig } from "extenzo";

/** Chromium MV2 manifest (deprecated). Building with -t chromium will trigger the MV2 warning. */
const manifest = {
  name: "exo-with-mv2 Example",
  version: "0.0.1",
  manifest_version: 2,
  description: "Example extension with Manifest V2 for Chromium (deprecated; use MV3)",
  permissions: ["storage", "activeTab", "<all_urls>"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["[exo.content]"],
    },
  ],
};

export default defineConfig({
  manifest,
});
