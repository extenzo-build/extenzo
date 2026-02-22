# zip

`zip` controls whether `extenzo build` packs the output directory into a zip file (e.g. for store upload or distribution). Only affects **build**; **dev** does not produce a zip.

## Type and default

- **Type**: `boolean | undefined`
- **Default**: `true` (zip is produced)

## Behavior

- **`true` or omitted**: After build, creates `{outDir}.zip` under [outputRoot](/config/output-root), e.g. `.extenzo/dist.zip`, containing the full [outDir](/config/out-dir) contents.
- **`false`**: Only outputs the directory, no zip.

## Examples

### Default (zip on)

```ts
export default defineConfig({
  outDir: "dist",
  outputRoot: ".extenzo",
  // zip true → .extenzo/dist.zip
});
```

### Disable zip

```ts
export default defineConfig({
  zip: false,
  // only .extenzo/dist, no zip
});
```

## Related

- [outDir](/config/out-dir), [outputRoot](/config/output-root).
