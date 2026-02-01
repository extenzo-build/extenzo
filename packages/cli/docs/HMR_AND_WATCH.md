# Build watch and HMR (Tailwind / PostCSS)

When using **build watch** (`extenzo dev` → `rsbuild.build({ watch: true })`) with **Tailwind v4** or other PostCSS setups (e.g. `@tailwindcss/postcss` in `postcss.config.mjs`), the bundler may otherwise emit `*.hot-update.js` / `*.hot-update.json` into the output directory and trigger a rebuild loop. The framework writes build output under **`.extenzo/<outDir>`** (default `outDir` is `dist`, so `.extenzo/dist`). The user can still customize `outDir`; that directory is created inside `.extenzo`. Watch and browser reload target this path (`.extenzo/outDir`), not `.extenzo` itself. This reduces the chance that Tailwind v4’s automatic content detection scans the build output. This doc explains why and how the framework prevents loops.

## Why it happens

- **Tailwind / PostCSS**: PostCSS expands the CSS dependency graph (e.g. `@import "tailwindcss"`, content scanning). In watch mode, more file changes trigger more incremental builds.
- **Rsbuild / Rspack**: In dev + watch, Rsbuild may still inject `HotModuleReplacementPlugin` or enable `devServer.hot`. Each incremental build then writes hot-update files to the output directory.
- **Extension context**: Extensions load from the output directory (`.extenzo/<outDir>`, e.g. `.extenzo/dist`); they do not use Rspack’s HMR runtime. Those hot-update files are unnecessary and, if the watcher does not ignore that directory, changes there trigger another build → loop and many useless JS files.

## How the framework fixes it (three layers)

The CLI applies three safeguards so that **no extra project config** is needed when using Tailwind/PostCSS with `extenzo dev`:

| Layer | Where | What it does |
|-------|--------|----------------|
| **Rsbuild dev** | [src/pipeline.ts](../src/pipeline.ts) – `injectHmrForDev` | Sets `dev.hmr: false` and `dev.liveReload: false` so Rsbuild does not enable HMR or full-page reload. |
| **Rspack HMR** | Same file – `disableRspackHmr()` inside `tools.rspack` | Sets `devServer.hot = false` and removes `HotModuleReplacementPlugin` from Rspack’s `plugins`, so no hot-update files are written to the output directory. |
| **Watch ignore output** | [@extenzo/plugin-entry](../../plugins/plugin-entry/src/index.ts) – `onBeforeCreateCompiler` | Adds the build output path (`distPath` = `.extenzo/<outDir>`) to Rspack’s `watchOptions.ignored`, so file changes there do not trigger another build. |

These run only when `command === "dev"` (build watch). For `extenzo build`, watch is off and the issue does not occur.

## If you still see rebuild loops or hot-update files

Ensure you are on a recent extenzo version that includes the above. No project-side config is required beyond your normal `postcss.config.mjs` and Tailwind setup.
