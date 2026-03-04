import { defineConfig } from "extenzo";

const manifest = {
  name: "Bookmarks Override Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Built-in bookmarks entry with auto-filled chrome_url_overrides.bookmarks",
};

export default defineConfig({
  outDir: "dist",
  manifest: {
    chromium: manifest,
    firefox: {
      ...manifest,
      browser_specific_settings: {
        gecko: {
          id: "extenzo-example-bookmarks-override@extenzo.com",
        },
      },
    },
  },
});
