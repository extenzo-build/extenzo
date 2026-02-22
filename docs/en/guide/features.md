# Features

A short overview of what Extenzo provides.

## Build and output

- **One config, multiple browsers**: One `exo.config.ts`; use CLI `-l chrome|edge|brave|vivaldi|opera|santa|firefox` to build; manifest can be split by `chromium` / `firefox`.
- **Output**: Default output under `.extenzo/dist` (controlled by `outputRoot`, `outDir`); optional zip after build (`zip: true`, default on).

## Entry and directory

- **Convention**: Auto-discover `background`, `content`, `popup`, `options`, `sidepanel`, `devtools` under root or `appDir`.
- **Custom entry**: Use `entry` to specify paths; reserved names are fixed, others can be custom (e.g. `capture`, `offscreen`).
- **See**: [entry](/config/entry), [appDir](/config/app-dir).

## Manifest

- **Three options**: Inline manifest object in config, path per browser (`manifest.chromium` / `manifest.firefox` as string paths), or omit to auto-load `manifest.json`, `manifest.chromium.json`, `manifest.firefox.json` from `appDir`.
- **See**: [manifest](/config/manifest).

## Plugins and Rsbuild

- **Built-in**: plugin-extension-entry (entry + HTML), plugin-extension-manifest (write manifest), plugin-extension-hmr (dev HMR); no need to declare in config.
- **User plugins**: `plugins: [vue()]`, `plugins: [react()]`, or other Rsbuild plugins.
- **Rsbuild extension**: `rsbuildConfig` object is deep-merged, or use function `(base, helpers)` for full control; define, alias, extra plugins, etc.
- **See**: [plugins](/config/plugins), [rsbuildConfig](/config/rsbuild-config).

## Dev and environment

- **Dev mode**: `extenzo dev` runs watch + HMR; configure `launch.chrome` / `launch.firefox` to open the browser and load the extension.
- **Env vars**: Root `.env` is loaded via Rsbuild loadEnv; `envPrefix` controls which vars are exposed to the client (e.g. `PUBLIC_`).
- **See**: [launch](/config/launch), [envPrefix](/config/env-prefix).

## Lifecycle

- **hooks**: `afterCliParsed`, `afterConfigLoaded`, `beforeRsbuildConfig`, `beforeBuild`, `afterBuild` to run logic at each stage.
- **See**: [hooks](/config/hooks).
