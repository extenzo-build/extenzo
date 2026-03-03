# Build output (outputRoot / outDir)

The full output path is **`outputRoot/outDir`**, default **`.extenzo/dist`**. All entry JS, CSS, HTML and the generated `manifest.json` are written there.

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **outputRoot** | `string \| undefined` | `".extenzo"` | Parent directory of the output. |
| **outDir** | `string \| undefined` | `"dist"` | Output directory name under outputRoot. |

**Path**: `path.resolve(root, outputRoot, outDir)`.

## Example

```ts
export default defineConfig({
  outputRoot: ".extenzo",
  outDir: "build",
  // Output: .extenzo/build
});
```

## Related

- [zip](/guide/zip): when `true`, `outDir.zip` is created under outputRoot.
