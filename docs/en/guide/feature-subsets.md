# Feature Subsets

Extenzo config can be split into the following feature subsets for reference and extension. Each option has its own page under **Configuration** in the sidebar, with type details and example code.

## Config options index

| Option | Description | Doc |
|--------|-------------|-----|
| **manifest** | Extension manifest: object/path config, per-browser split (chromium/firefox), or omit to auto-load manifest.json. | [manifest](/config/manifest) |
| **entry** | Custom entry map: reserved names (popup, options, background, etc.), value = path relative to baseDir. | [entry](/config/entry) |
| **appDir** | App directory, default project root; baseDir for entry and root for manifest auto-load. | [appDir](/config/app-dir) |
| **outDir** | Output directory name, default `"dist"`; full path is outputRoot/outDir. | [outDir](/config/out-dir) |
| **outputRoot** | Parent directory for build output, default `".extenzo"`; with outDir defines full output path. | [outputRoot](/config/output-root) |
| **zip** | Whether to pack output into a zip after build; default true. | [zip](/config/zip) |
| **envPrefix** | Prefixes for .env vars injected into client; default `['']` exposes all. | [envPrefix](/config/env-prefix) |
| **launch** | Chrome/Firefox executable paths for `extenzo dev` to auto-open the browser. | [launch](/config/launch) |
| **hooks** | Lifecycle hooks: afterCliParsed, afterConfigLoaded, beforeRsbuildConfig, beforeBuild, afterBuild. | [hooks](/config/hooks) |
| **plugins** | Rsbuild plugins array: built-in plugin-entry, plugin-extension, plugin-extension-hmr; user adds vue(), react(). | [plugins](/config/plugins) |
| **rsbuildConfig** | Override or extend Rsbuild config: object deep-merge or function (base, helpers). | [rsbuildConfig](/config/rsbuild-config) |

## Relation to CLI

- **extenzo dev**: Uses manifest, entry, plugins, launch, rsbuildConfig; HMR and browser launch depend on plugin-extension-hmr and launch.
- **extenzo build**: Uses manifest, entry, plugins, rsbuildConfig; plugin-extension writes manifest.json; when zip is true, produces outDir.zip under outputRoot.

## Next steps

- Read [Introduction](/guide/introduction) for core capabilities.
- Follow [Install](/guide/install) to create a project.
- See [Configuration](/config/manifest) for per-option details and example code.
