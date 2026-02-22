# Introduction

Extenzo is a **browser extension development framework based on Rsbuild**, helping you develop and build Chrome and Firefox extensions in one project.

## Why Extenzo

- **Same experience in dev and production**: We believe browser extension development involves more complex debugging, so **full-bundle mode** is necessary to minimize the gap between development and production. Thanks to **Rsbuild’s performance**, extenzo uses **build watch** for hot reload—you get the same bundled output in dev and production, so behavior stays consistent, without sacrificing build speed.
- **Single dependency**: Install `extenzo` to get the CLI and build pipeline (internally uses `@extenzo/cli`, `@rsbuild/core`, and built-in plugins).
- **Simple config**: One `exo.config.ts` (or `exo.config.js`) at the root for manifest, entry, plugins, and Rsbuild.
- **Dual browser**: Use manifest `chromium` / `firefox` branches and CLI `-l chrome|edge|brave|vivaldi|opera|santa|firefox` for output and debugging.
- **Dev-friendly**: `extenzo dev` runs watch + HMR, opens the browser and loads the extension; WebSocket triggers reload after each build.
- **Extensible**: `rsbuildConfig` supports object deep-merge or function form; lifecycle hooks available.

## Core capabilities

| Capability | Description |
|------------|-------------|
| **Manifest** | Object config, path config, or omit to auto-load `manifest.json`, `manifest.chromium.json`, `manifest.firefox.json` from `appDir` / `appDir/manifest`, merged per browser. |
| **Entry discovery** | Default discovery of `background`, `content`, `popup`, `options`, `sidepanel`, `devtools` from root or `appDir`; override with `entry`. |
| **Plugins** | Built-in plugin-entry (entry + HTML), plugin-extension (write manifest.json), plugin-extension-hmr (dev HMR); add framework via `plugins: [vue()]`, `plugins: [react()]`. |
| **Rsbuild extension** | Object `rsbuildConfig` deep-merged with base; function form receives `(base, helpers)` and can use `helpers.merge`. |

## Compared to other solutions

- **vs hand-written Webpack/Rspack**: Extenzo handles extension-specific entry resolution, manifest injection, and dev HMR; you focus on app and manifest.
- **vs CRXJ/Vite, etc.**: Based on Rsbuild for build performance and ecosystem; config style similar to Vite (single file, plugins array, rsbuildConfig).

Next: [Installation](/guide/install) to create your first project.
