import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "@rslib/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "src");

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
      runtime: "./src/runtime.ts",
    },
  },
  lib: [
    {
      format: "esm",
      dts: true,
      output: {
        sourceMap: true,
        cleanDistPath: true,
        copy: [
          { from: "monitor-page.html", context: srcDir },
          { from: "monitor-page.js", context: srcDir },
        ],
      },
    },
  ],
  tools: {
    rspack(config, { addRules }) {
      addRules([
        {
          test: /[\\/]monitor-page\.(html|js)$/,
          type: "asset/source",
        },
      ]);
    },
  },
});
