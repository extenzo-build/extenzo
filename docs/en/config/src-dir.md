# srcDir

`srcDir` is the **source directory**, defaulting to the project root (`"."`). It is used as **baseDir for [entry](/config/entry)** and as the **root for manifest auto-load**.

## Type and default

- **Type**: `string | undefined`
- **Default**: `"."` (project root)
- **Resolved**: Framework resolves to an absolute path, e.g. `srcDir: "src"` → `path.resolve(root, "src")`.

## Role

1. **baseDir for entry**  
   All [entry](/config/entry) paths are **relative to srcDir**. E.g. `srcDir: "src"` and `entry: { popup: "popup/index.ts" }` → `src/popup/index.ts`.

2. **Entry discovery**  
   When [entry](/config/entry) is not set, the framework discovers `background`, `content`, `popup`, `options`, `sidepanel`, `devtools` under srcDir by directory name.

3. **Manifest auto-load**  
   When [manifest](/config/manifest) is not set in config, the framework looks for:
   - `srcDir/manifest.json`, `srcDir/manifest.chromium.json`, `srcDir/manifest.firefox.json`
   - `srcDir/manifest/manifest.json`, etc.

## Examples

### Source in `src/`

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  srcDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
    options: "options/index.ts",
  },
});
```

### Root as source (default)

```ts
export default defineConfig({
  // srcDir omitted → "."
  entry: { background: "background/index.ts", popup: "popup/index.ts" },
});
```

## Related

- [entry](/config/entry), [manifest](/config/manifest): Paths and auto-load are relative to srcDir.
