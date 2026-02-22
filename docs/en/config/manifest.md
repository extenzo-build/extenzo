# manifest

`manifest` declares the extension manifest (the content of the final `manifest.json` in the build output). It supports three styles: **inline object**, **object split by browser** (chromium/firefox), or **file paths**; it can also be **omitted** so the framework auto-loads manifest files from the source directory.

## Type and default behavior

- **Type**: `ManifestConfig | ManifestPathConfig | undefined`
- **Default**: When omitted, the framework loads from `appDir` or `appDir/manifest/`:
  - `manifest.json` (shared or single browser)
  - `manifest.chromium.json` (Chrome overrides)
  - `manifest.firefox.json` (Firefox overrides)
- At build time, the branch is chosen by CLI `-l chrome|edge|brave|vivaldi|opera|santa|firefox` and merged with base, then written to `outputRoot/outDir/manifest.json`.

## Configuration styles

### 1. Single object (Chrome / Firefox shared)

All fields in one object. The framework injects entry paths for `background`, `content_scripts`, `action`, `options_ui`, `side_panel`, `devtools_page` according to the current target; other fields are output as-is.

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"], run_at: "document_start" },
    ],
  },
});
```

Entry paths (e.g. `popup/index.html`, `background/index.js`) are computed by the framework from [entry](/config/entry) and [outDir](/config/out-dir). You only need to keep these keys in manifest; see [MANIFEST_ENTRY_PATHS](https://github.com/extenzo-build/extenzo/blob/main/packages/core/src/constants.ts) for custom keys.

### 2. Split by browser (chromium / firefox)

When Chrome and Firefox need different manifest fields (e.g. Chrome `action` vs Firefox `sidebar_action`, or `service_worker` vs `scripts`), use `chromium` and `firefox` branches. The framework picks the branch by current `-b` and deep-merges with base.

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  manifest: {
    chromium: {
      name: "My Ext",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [{ matches: ["<all_urls>"], js: ["content/index.js"] }],
    },
    firefox: {
      name: "My Ext",
      manifest_version: 2,
      sidebar_action: { default_panel: "sidepanel/index.html" },
      background: { scripts: ["background/index.js"] },
      content_scripts: [{ matches: ["<all_urls>"], js: ["content/index.js"] }],
    },
  },
});
```

### 3. Path config (relative to appDir)

To keep manifest in external JSON files, specify paths **relative to [appDir](/config/app-dir)**.

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  appDir: "src",
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

### 4. Omit (auto-load)

When `manifest` is not set, the framework looks for:

1. `appDir/manifest.json`, `appDir/manifest.chromium.json`, `appDir/manifest.firefox.json`
2. `appDir/manifest/manifest.json`, `appDir/manifest/manifest.chromium.json`, `appDir/manifest/manifest.firefox.json`

Any found file is used as base and merged with chromium/firefox files in the same directory.

## Priority

| Style | Description |
|-------|-------------|
| manifest object or paths in config | Highest |
| manifest*.json in appDir root | Next |
| manifest*.json in appDir/manifest/ | Then |

## Related

- [entry](/config/entry): Entry scripts and HTML determine manifest paths.
- [appDir](/config/app-dir): Path config and auto-load are relative to appDir.
- [outDir](/config/out-dir), [outputRoot](/config/output-root): Build output directory.
