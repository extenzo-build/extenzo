# plugins

`plugins` is the **Rsbuild plugins array** (like Vite), using function calls such as `plugins: [vue()]` or `plugins: [pluginReact()]`. Use it to add Vue (via `@extenzo/rsbuild-plugin-vue`), React (via `@rsbuild/plugin-react`), or other Rsbuild plugins.

## Type and default

- **Type**: `RsbuildConfig["plugins"]`
- **Default**: When omitted, only framework-built-in plugins run (no Vue/React); you **must** add the Vue or React plugin explicitly if you use them.

## Framework-built-in plugins (auto-injected)

These are injected by **@extenzo/cli**; do **not** add them in config:

| Plugin | Role |
|--------|------|
| **rsbuild-plugin-extension-entry** | Resolves [entry](/config/entry) and [appDir](/config/app-dir), sets Rsbuild entry, HTML templates, output paths, public copy |
| **rsbuild-plugin-extension-manifest** | After build, writes resolved [manifest](/config/manifest) to `manifest.json` in the output dir (chromium/firefox by `-b`); expands [exo.content] placeholders and removes empty css |
| **rsbuild-plugin-extension-hmr** | Dev only: WebSocket and browser reload |
| **rsbuild-plugin-extension-monitor** | Dev only when `--debug` or `debug: true`: error monitoring, panel with Ask AI (ChatGPT, Cursor), theme toggle |

## User plugins: Vue / React

Add the framework Vue or React plugin to enable that stack:

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import vue from "@extenzo/rsbuild-plugin-vue";
// or for React:
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [vue()],
  // or plugins: [pluginReact()],
});
```

## With other Rsbuild plugins

You can mix in Rsbuild plugins (e.g. Less):

```ts
import { defineConfig } from "extenzo";
import vue from "@extenzo/rsbuild-plugin-vue";
import { pluginLess } from "@rsbuild/plugin-less";

export default defineConfig({
  plugins: [vue(), pluginLess()],
});
```

## Plugin order

The framework assembles: **rsbuild-plugin-extension-entry** → user **plugins** (with Vue/React expanded) → **rsbuild-plugin-extension-manifest**. Do not add rsbuild-plugin-extension-entry, rsbuild-plugin-extension-manifest, or rsbuild-plugin-extension-hmr manually.

## Single plugin

Always use an array:

```ts
export default defineConfig({
  plugins: [react()],
});
```

## Related

- [rsbuildConfig](/config/rsbuild-config), [entry](/config/entry), [manifest](/config/manifest).
