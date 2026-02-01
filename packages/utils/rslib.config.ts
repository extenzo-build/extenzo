import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      "webextension-polyfill": "./src/webextension-polyfill.ts",
    },
  },
  lib: [
    {
      format: "esm",
      dts: true,
      output: {
        sourceMap: true,
        cleanDistPath: true,
      },
    },
  ],
});
