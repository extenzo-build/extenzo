<p align="center">
  <img width="230" src="extenzo.png">
</p>

<h1 align="center">
Extenzo
</h1>
<p align="center">
Browser extension development framework built on Rsbuild
</p>

<div align="center">
![](https://img.shields.io/github/package-json/v/extenzo-build/extenzo)
</div>

## Why extenzo

Browser extension development involves more complex debugging than typical web apps, so we believe **full-bundle mode** is necessary to minimize the gap between development and production. Thanks to **Rsbuild’s performance**, extenzo uses **build watch** for hot reload—you get the same bundled output in dev and production, so behavior stays consistent, without sacrificing build speed.

## Quick start

### Option 1: Scaffold a new project

```bash
pnpm create extenzo-app
# or
npx create-extenzo-app
```

Follow the prompts to pick a framework (Vanilla / Vue / React) and language (JavaScript / TypeScript); a full project layout and config will be generated.

### Option 2: Add to an existing project

Install the main package **extenzo** as a **dev dependency** (build tool; one install gives you the CLI and all build tooling; internally it uses `@extenzo/cli` and `@rsbuild/core`):

```bash
pnpm add -D extenzo
# or
npm install -D extenzo
# or
yarn add -D extenzo
```

Create `exo.config.ts` (or `exo.config.js`) in the project root and configure it as below. Your layout must include entries such as `background`, `content`, `popup`, `options`, `sidepanel` (under `app/` by default or under a dir set via `srcDir`).

### Packages and imports

- **Core** (`defineConfig`, types, discovery, manifest, etc.) is exported from **extenzo**. In config use: `import { defineConfig } from "extenzo"`.
- **Content UI** is in **`@extenzo/utils`**: `import { defineContentUI, mountContentUI } from "@extenzo/utils"` for injecting UI in content scripts. For the `browser` API, install [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) and use `import browser from "webextension-polyfill"`.

## Config

Config file: `exo.config.ts` or `exo.config.js`.

Return a config object from `defineConfig`. Supported fields:

| Field | Description |
|-------|-------------|
| **manifest** | Extension manifest. Object(s) in config, path strings (relative to srcDir), or omit to auto-load: srcDir then srcDir/manifest for `manifest.json` / `manifest.chromium.json` / `manifest.firefox.json` |
| **plugins** | Rsbuild plugins array (like Vite). Use function calls, e.g. `plugins: [vue()]` (from `@extenzo/plugin-vue`) or `plugins: [pluginReact()]` (from `@rsbuild/plugin-react`) |
| **rsbuildConfig** | Override or extend Rsbuild config (like Vite’s build options). **Object**: deep-merged with base. **Function**: `(base) => config` for full control |
| **entry** | Custom entries: object, key = entry name (reserved: popup, options, sidepanel, background, devtools, content; others custom), value = path string relative to baseDir (e.g. `'content/index.ts'`). Omit to use default discovery from baseDir |
| **srcDir** | Source directory; default is `app/`. Also the base for **entry** paths |
| **outDir** | Output directory; default `"dist"` |
| **launch** | Dev browser paths. `launch.chrome`, `launch.firefox` for Chrome/Firefox executables; used when running `extenzo dev`. If unset, tries OS default install paths (see [launch](/config/launch)) |
| **hooks** | Lifecycle hooks at “parse CLI → load config → build Rsbuild config → run build”. See “Lifecycle hooks” below |

**Manifest from files:** Priority: (1) manifest in exo.config, (2) files in **srcDir** (`manifest.json`, `manifest.chromium.json`, `manifest.firefox.json`), (3) files in **srcDir/manifest/** if none in srcDir. Base and overrides are deep-merged per browser. You can also set paths in config: `manifest: { chromium: 'src/manifest/manifest.json', firefox: '...' }`; paths are resolved from srcDir.

### Lifecycle hooks

Configure `hooks` in `defineConfig`. Each hook receives `PipelineContext` (root, command, browser, config, entries, rsbuildConfig, etc.):

| Hook | When |
|------|------|
| **afterCliParsed** | After CLI args (command, -b) are parsed |
| **afterConfigLoaded** | After config and entries are resolved |
| **beforeRsbuildConfig** | After manifest and entries are fixed, before Rsbuild config is built |
| **beforeBuild** | After Rsbuild config is ready, before build runs |
| **afterBuild** | After build finishes (only for `extenzo build`; dev runs watch and does not exit) |

### Errors and exit codes

On missing config, no entries, invalid command or invalid `-b`, the CLI throws **ExtenzoError** (with `code`, `details`, `hint`), prints a clear message to stderr and exits with a non-zero code. Error codes are exported from `extenzo` as `EXTENZO_ERROR_CODES`.

### Config example

```ts
import { defineConfig } from "extenzo";
import vue from "@extenzo/plugin-vue";

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
  },
  plugins: [vue()],
  // launch: { chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", firefox: "..." },
  // rsbuildConfig: (config) => config,
  // entry: { background: "background/index.ts", content: "content/index.ts", popup: "popup/index.html" },
  // hooks: { beforeBuild: (ctx) => console.log("Building for", ctx.browser) },
});
```

## Directory and entry convention

- By default, entries are discovered under **app/** or **srcDir** (baseDir). You can override with **entry**:
  - **background**, **content**: script only
  - **popup**, **options**, **sidepanel**, **devtools**: HTML entry (e.g. `index.html`); scripts, if any, are included in the HTML
  - Reserved names (fixed): popup, options, sidepanel, background, devtools, content; other names are custom
  - **entry** values are paths relative to baseDir, e.g. `'content/index.ts'`, `'src/popup/index.ts'`

## Commands

In a project that has extenzo installed:

- `extenzo dev` or `pnpm dev` (if `"dev": "extenzo dev"` in package.json): dev mode with watch and HMR (Reload Manager extension + local WebSocket)
- `extenzo build`: production build to `outDir` (default `dist`)

**Terminal output**: When running `extenzo dev` or `extenzo build`, each line is prefixed with **`[extenzo]`** so you can tell extenzo’s output from Rsbuild’s; full Rsbuild logs and errors are unchanged.

Use **`-b chrome`** or **`-b firefox`** to choose the target browser (and thus manifest branch and dev browser):

- `extenzo dev -b chrome` / `extenzo dev -b firefox`
- `extenzo build -b chrome` / `extenzo build -b firefox`

Default is Chrome if `-b` is omitted. The target is determined only by `-b`, not by env vars.

## Architecture

The following diagram shows how extenzo goes from your config to a built extension and (in dev) to browser launch and HMR.

<p align="center">
  <img src="extenzo-architecture.png" alt="Extenzo architecture: config → Pipeline → Rsbuild → dev HMR / build output" width="720">
</p>



**Summary:** CLI loads `exo.config`, resolves manifest (from config or `srcDir` / `srcDir/manifest`), discovers and resolves entries, then builds an Rsbuild config with **plugin-extension-entry** (entries + HTML), your **plugins** (e.g. Vue/React), and **plugin-extension-manifest** (writes `manifest.json` after build). In **dev**, **plugin-hmr** starts a WebSocket server and opens the browser; each rebuild triggers a reload. In **build**, the output is written and optionally zipped.

## Dependencies

The framework follows common practice: **recommended dev dependencies** are checked before build and **installed automatically** when missing (using the project’s package manager: pnpm / npm / yarn / bun).

- **Extension development**: `@types/chrome` (Chrome extension API types) is installed as a dev dependency if not already in the project.
- **Plugins**: If you use `plugins: [vue()]`, the CLI ensures `vue` is installed; if you use `plugins: [react()]`, it ensures `react` and `react-dom` are installed. Plugins declare these as optional peer dependencies.

To skip auto-install (e.g. in CI or when you manage deps yourself), set **`EXTENZO_SKIP_DEPS=1`**.

- **extenzo** brings in `@extenzo/cli`, `@rsbuild/core`, and the framework plugins; add **extenzo** as a dev dependency and use `extenzo dev` and `extenzo build` in your scripts.

## Dev HMR

In dev, a WebSocket server is started and the extension is reloaded after each build. The Rsbuild plugin opens the browser and loads the extension after the first build; later rebuilds trigger a reload via WebSocket.

Browser paths: set **launch** in config to override; otherwise the framework tries OS default paths (Windows / macOS / Linux common install locations).

## Repo structure

- `packages/extenzo`: **extenzo** – main package users install; provides the `extenzo` binary and delegates to `@extenzo/cli` (same idea as installing `parcel` while internals live in `@parcel/*`)
- `packages/cli`: **@extenzo/cli** – CLI entry and **Pipeline** (parse → config → Rsbuild config → hooks; injects ConfigLoader / CliParser)
- `packages/core`: Core modules; filenames match class names (camelCase): **ConfigLoader** (configLoader.ts), **CliParser** (cliParser.ts), **EntryDiscoverer** (entryDiscoverer.ts), **EntryResolver** (entryResolver.ts), **ManifestBuilder** (manifestBuilder.ts); constants, ExtenzoError, mergeRsbuildConfig, defineConfig, types
- `packages/utils`: Utilities (webextension-polyfill etc.); use `@extenzo/utils` as needed
- `packages/plugins/plugin-entry**: **Internal** – resolves dirs and entries, sets entry/html/output (package: `@extenzo/plugin-extension-entry`)
- `packages/plugins/plugin-extension`: **Internal** – writes manifest.json (package: `@extenzo/plugin-extension-manifest`)
- `packages/plugins/plugin-hmr**: **Internal** – dev HMR and browser launch
- `packages/plugins/plugin-vue`: Vue 3 + Vue JSX + Less + Babel; use `plugins: [vue()]`
- `packages/create-extenzo-app`: Scaffold CLI; generates project with `plugins: [vue()]` or `plugins: [pluginReact()]` (use `@rsbuild/plugin-react` for React)

The framework runs plugin-extension-entry, plugin-extension-manifest and plugin-hmr by default. Users add framework plugins via `plugins: [vue()]` etc. and override Rsbuild via `rsbuildConfig`.

## Test coverage & Codecov

- **Per-package coverage**: `pnpm run test:coverage` runs tests with coverage in each package; each package writes to `./coverage/` (html, json, **lcov.info**).
- **Merged report for Codecov**: `pnpm run test:coverage:report` runs all package coverages and merges them into **`coverage/lcov.info`** at repo root. Use this file with [Codecov](https://codecov.io) to get a single coverage badge (e.g. in CI: run `test:coverage:report`, then upload `coverage/lcov.info` with the Codecov CLI or GitHub Action).
- Config: `codecov.yml` at repo root; root `coverage/` is in `.gitignore`.
