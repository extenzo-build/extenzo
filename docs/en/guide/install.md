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

Create `exo.config.ts` (or `exo.config.js`) at the project root, and ensure you have `background`, `content`, `popup`, `options`, `sidepanel` entries under the root or under `appDir`.

### 3. Minimal config example

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react"; // or vue from "@extenzo/plugin-vue"

export default defineConfig({
  appDir: "src",
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
- **Runtime**: For the `browser` API (Chrome/Firefox), install [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) and use `import browser from "webextension-polyfill"`. **Content UI**: `@extenzo/utils` provides `defineContentUI` / `mountContentUI` for injecting UI in content scripts; use `import { defineContentUI, mountContentUI } from "@extenzo/utils"`.

### 5. Run commands

- **Dev**: `extenzo dev` or `pnpm dev` (if `"dev": "extenzo dev"` in package.json).
- **Build**: `extenzo build`; output goes to `outputRoot/outDir` (default `.extenzo/dist`).

Use `-l chrome|edge|brave|vivaldi|opera|santa|firefox` for target browser:

```bash
extenzo dev -l chrome
extenzo build -l firefox
```

Default is Chrome when not specified.
