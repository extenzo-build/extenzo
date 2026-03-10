# outDir

`outDir` is the **build output directory name**, under [outputRoot](/config/output-root). The full output path is `outputRoot/outDir`, default `.extenzo/extension`.

## Type and default

- **Type**: `string | undefined`
- **Default**: `"extension"`
- **Full path**: `path.resolve(root, outputRoot, outDir)`.

## Role

- All entry outputs (JS, CSS, HTML) and the generated [manifest](/config/manifest) `manifest.json` go under this directory.
- `extenzo dev` loads the extension from this path.
- When [zip](/config/zip) is enabled, `extenzo build` produces `outDir.zip` (e.g. `extension.zip`) under outputRoot.

## Examples

### Default

```ts
export default defineConfig({
  // outDir default "extension" → output at .extenzo/extension
});
```

### Custom name

```ts
export default defineConfig({
  outDir: "build",
  outputRoot: ".extenzo",
  // output at .extenzo/build
});
```

## Related

- [outputRoot](/config/output-root), [zip](/config/zip).
