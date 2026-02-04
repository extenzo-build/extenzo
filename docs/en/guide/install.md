# Installation

## Option 1: Scaffold a project

```bash
pnpm create extenzo-app
# or
npx create-extenzo-app
```

Choose framework (Vanilla / Vue / React) and language (JavaScript / TypeScript) to generate project structure and config.

## Option 2: Add to an existing project

### 1. Install extenzo

Install **extenzo** as a **dev dependency** (one package includes CLI and build):

```bash
pnpm add -D extenzo
# or
npm install -D extenzo
# or
yarn add -D extenzo
```

### 2. Add config file

Create `ext.config.ts` (or `ext.config.js`) at the project root, and ensure you have `background`, `content`, `popup`, `options`, `sidepanel` entries under the root or under `srcDir`.

### 3. Minimal config example

```ts
// ext.config.ts
import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react"; // or vue from "@extenzo/plugin-vue"

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [{ matches: ["<all_urls>"], js: ["content/index.js"] }],
  },
  plugins: [pluginReact()],
});
```

### 4. Packages and imports

- **Core**: `defineConfig`, types, entry discovery, manifest helpers are exported from `extenzo`. Use: `import { defineConfig } from "extenzo"`.
- **Runtime**: e.g. [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) from `@extenzo/utils`. After installing `@extenzo/utils`: `import browser from "@extenzo/utils/webextension-polyfill"`.

### 5. Run commands

- **Dev**: `extenzo dev` or `pnpm dev` (if `"dev": "extenzo dev"` in package.json).
- **Build**: `extenzo build`; output goes to `outputRoot/outDir` (default `.extenzo/dist`).

Use `-b chrome` or `-b firefox` for target browser:

```bash
extenzo dev -b chrome
extenzo build -b firefox
```

Default is Chrome when not specified.
