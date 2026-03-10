# outputRoot

`outputRoot` is the **parent directory** of the build output, default `".extenzo"`. The full output path is `outputRoot/[outDir](/config/out-dir)`, e.g. `.extenzo/extension` by default.

## Type and default

- **Type**: `string | undefined`
- **Default**: `".extenzo"`

## Why .extenzo

Using `.extenzo/extension` instead of root `dist` avoids tools (e.g. Tailwind v4) scanning the root and treating the output dir as source, which can cause circular builds or extra watch.

## Examples

### Default

```ts
export default defineConfig({
  // outputRoot ".extenzo", outDir "extension" → .extenzo/extension
});
```

### Custom root

```ts
export default defineConfig({
  outputRoot: "output",
  outDir: "chrome",
  // output at output/chrome
});
```

## Related

- [outDir](/config/out-dir), [zip](/config/zip).
