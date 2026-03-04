import { defineConfig } from "extenzo";

const manifest = {
  name: "Sandbox Entry Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Built-in sandbox entry with auto-filled manifest.sandbox.pages",
  content_security_policy: {
    sandbox: "sandbox allow-scripts; script-src 'self' 'unsafe-inline'",
  },
};

export default defineConfig({
  outDir: "dist",
  manifest: {
    chromium: manifest,
    firefox: {
      ...manifest,
      browser_specific_settings: {
        gecko: {
          id: "extenzo-example-sandbox@extenzo.com",
        },
      },
    },
  },
});
