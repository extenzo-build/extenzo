<p align="center">
  <img width="230" src="extenzo.png">
</p>

<h1 align="center">
Extenzo
</h1>
<p align="center">
Browser extension development framework built on Rsbuild
</p>

## Quick start

### Option 1: Scaffold a new project

```bash
pnpm create extenzo-app
# or
npx create-extenzo-app
```

Follow the prompts to pick a framework (Vanilla / Vue / React) and language (JavaScript / TypeScript); a full project layout and config will be generated.

### Option 2: Add to an existing project

```bash
pnpm add @extenzo/cli @rsbuild/core
```

Create `ext.config.ts` (or `ext.config.js`) in the project root and configure it as below. Your layout must include entries such as `background`, `content`, `popup`, `options`, `sidepanel` (either at root or under a dir set via `srcDir`).

### Packages and imports

- **Core** (`defineConfig`, types, discovery, manifest, etc.) is exported from **`@extenzo/core`**. In config use: `import { defineConfig } from "@extenzo/core"`.
- **Runtime utilities** (e.g. [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)) are exported from **`@extenzo/utils`**. Install `@extenzo/utils` and use:

```ts
import browser from "@extenzo/utils/webextension-polyfill";
```

## Config

Config file: `ext.config.ts` or `ext.config.js`.

Return a config object from `defineConfig`. Supported fields:

| Field | Description |
|-------|-------------|
| **manifest** | Extension manifest. Single object or split as `chromium` / `firefox` |
| **plugins** | Rsbuild plugins array (like Vite). Use function calls, e.g. `plugins: [vue()]`, `plugins: [react()]` (import from `@extenzo/plugin-vue` / `@extenzo/plugin-react`) |
| **rsbuildConfig** | Override or extend Rsbuild config (like Vite’s build options). **Object**: deep-merged with base. **Function**: `(base) => config` for full control |
| **entry** | Custom entries: object, key = entry name (reserved: popup, options, sidepanel, background, devtools, content; others custom), value = path string relative to baseDir (e.g. `'content/index.ts'`). Omit to use default discovery from baseDir |
| **srcDir** | Source directory; default is project root. Also the base for **entry** paths |
| **outDir** | Output directory; default `"dist"` |
| **launch** | Dev browser paths. `launch.chrome`, `launch.firefox` for Chrome/Firefox executables; used when running `extenzo dev`. Falls back to `.env` `BROWSER_CHROME` / `BROWSER_FIREFOX` if unset |
| **hooks** | Lifecycle hooks at “parse CLI → load config → build Rsbuild config → run build”. See “Lifecycle hooks” below |

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

On missing config, no entries, invalid command or invalid `-b`, the CLI throws **ExtenzoError** (with `code`, `details`, `hint`), prints a clear message to stderr and exits with a non-zero code. Error codes are exported from `@extenzo/core` as `EXTENZO_ERROR_CODES`.

### Config example

```ts
import { defineConfig } from "@extenzo/core";
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
  // entry: { background: "background/index.ts", content: "content/index.ts", popup: "popup/index.ts" },
  // hooks: { beforeBuild: (ctx) => console.log("Building for", ctx.browser) },
});
```

## Directory and entry convention

- By default, entries are discovered under the **project root** or **srcDir** (baseDir). You can override with **entry**:
  - **background**, **content**: script only
  - **popup**, **options**, **sidepanel**, **devtools**: require `index.html` + entry script in the same dir
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

## Dependencies

The framework follows common practice: **recommended dev dependencies** are checked before build and **installed automatically** when missing (using the project’s package manager: pnpm / npm / yarn / bun).

- **Extension development**: `@types/chrome` (Chrome extension API types) is installed as a dev dependency if not already in the project.
- **Plugins**: If you use `plugins: [vue()]`, the CLI ensures `vue` is installed; if you use `plugins: [react()]`, it ensures `react` and `react-dom` are installed. Plugins declare these as optional peer dependencies.

To skip auto-install (e.g. in CI or when you manage deps yourself), set **`EXTENZO_SKIP_DEPS=1`**.

- **@rsbuild/core** and plugin-related build deps (e.g. `@rsbuild/plugin-vue`) are provided by the framework; you only need to add `@extenzo/cli` (and optionally `@extenzo/plugin-vue` / `@extenzo/plugin-react`) to your project.

## Dev HMR

In dev, a WebSocket server is started and the extension is reloaded after each build. The Rsbuild plugin opens the browser and loads the extension after the first build; later rebuilds trigger a reload via WebSocket.

Browser paths can be set via **launch** in config or **.env** (launch wins):

- **ext.config**: `launch: { chrome: "C:\\...\\chrome.exe", firefox: "C:\\...\\firefox.exe" }`
- **.env**: `BROWSER_CHROME=...`, `BROWSER_FIREFOX=...`

## Repo structure

- `packages/cli`: **@extenzo/cli** – CLI entry and **Pipeline** (parse → config → Rsbuild config → hooks; injects ConfigLoader / CliParser)
- `packages/core`: Core modules; filenames match class names (camelCase): **ConfigLoader** (configLoader.ts), **CliParser** (cliParser.ts), **EntryDiscoverer** (entryDiscoverer.ts), **EntryResolver** (entryResolver.ts), **ManifestBuilder** (manifestBuilder.ts); constants, ExtenzoError, mergeRsbuildConfig, defineConfig, types
- `packages/utils`: Utilities (webextension-polyfill etc.); use `@extenzo/utils` as needed
- `packages/plugins/plugin-entry**: **Internal** – resolves dirs and entries, sets entry/html/output
- `packages/plugins/plugin-extension`: **Internal** – writes manifest.json
- `packages/plugins/plugin-hmr**: **Internal** – dev HMR and browser launch
- `packages/plugins/plugin-vue`: Vue 3 + Vue JSX + Less + Babel; use `plugins: [vue()]`
- `packages/plugins/plugin-react`: React + JSX; use `plugins: [react()]`
- `packages/create-extenzo-app`: Scaffold CLI; generates project with `plugins: [vue()]` or `plugins: [react()]`

The framework runs plugin-entry, plugin-extension and plugin-hmr by default. Users add framework plugins via `plugins: [vue()]` etc. and override Rsbuild via `rsbuildConfig`.
