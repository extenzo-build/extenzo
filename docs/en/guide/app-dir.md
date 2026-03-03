# App directory (appDir)

`appDir` is the **app directory**, defaulting to `app/`. It is used as **baseDir for [entry](/guide/entry)** and as the **root for manifest auto-load**.

## Type and default

- **Type**: `string | undefined`
- **Default**: `"app"` (framework convention)
- **Resolved**: Framework resolves to an absolute path, e.g. `appDir: "src"` → `path.resolve(root, "src")`.

## Role

1. **baseDir for entry**  
   All [entry](/guide/entry) paths are **relative to appDir**.
2. **Entry discovery**  
   When [entry](/guide/entry) is not set, the framework discovers `background`, `content`, `popup`, `options`, `sidepanel`, `devtools` under appDir by directory name.
3. **Manifest auto-load**  
   When [manifest](/guide/manifest) is not set in config, the framework looks for `appDir/manifest.json`, `appDir/manifest.chromium.json`, `appDir/manifest.firefox.json`, etc.

## Examples

See [entry](/guide/entry) and [manifest](/guide/manifest) for path and auto-load behavior.

## Related

- [entry](/guide/entry), [manifest](/guide/manifest): Paths and auto-load are relative to appDir.
