# plugins

`plugins` is the **Rsbuild plugins array** (like Vite), using function calls such as `plugins: [vue()]` or `plugins: [pluginReact()]`. Use it to add Vue (via `@extenzo/plugin-vue`), React (via `@rsbuild/plugin-react`), or other Rsbuild plugins.

## Type and default

- **Type**: `RsbuildConfig["plugins"]`
- **Default**: When omitted, only framework-built-in plugins run (no Vue/React); you **must** add the Vue or React plugin explicitly if you use them.

## Framework-built-in plugins (auto-injected)

These are injected by **@extenzo/cli**; do **not** add them in config:

| Plugin | Role |
|--------|------|
| **plugin-entry** | Resolves [entry](/config/entry) and [srcDir](/config/src-dir), sets Rsbuild entry, HTML templates, output paths, public copy |
| **plugin-extension** | After build, writes resolved [manifest](/config/manifest) to `manifest.json` in the output dir (chromium/firefox by `-b`) |
| **plugin-hmr** | Dev only: WebSocket and browser reload |

## User plugins: Vue / React

Add the framework Vue or React plugin to enable that stack:

```ts
// ext.config.ts
import { defineConfig } from "extenzo";
import vue from "@extenzo/plugin-vue";
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
import vue from "@extenzo/plugin-vue";
import { pluginLess } from "@rsbuild/plugin-less";

export default defineConfig({
  plugins: [vue(), pluginLess()],
});
```

## Plugin order

The framework assembles: **plugin-entry** → user **plugins** (with Vue/React expanded) → **plugin-extension**. Do not add plugin-entry, plugin-extension, or plugin-hmr manually.

## Single plugin

Always use an array:

```ts
export default defineConfig({
  plugins: [react()],
});
```

## Related

- [rsbuildConfig](/config/rsbuild-config), [entry](/config/entry), [manifest](/config/manifest).
