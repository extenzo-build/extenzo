import { defineConfig } from "extenzo";

const manifest = {
  name: "History Override Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Built-in history entry with auto-filled chrome_url_overrides.history",
};

export default defineConfig({
  outDir: "dist",
  manifest: {
    chromium: manifest,
    firefox: {
      ...manifest,
      browser_specific_settings: {
        gecko: {
          id: "extenzo-example-history-override@extenzo.com",
        },
      },
    },
  },
});
