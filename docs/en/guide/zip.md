# Zip file

`zip` controls whether `extenzo build` packages the output directory into a zip file (for store submission or distribution). Only affects **build**; **dev** does not produce a zip.

## Type and default

- **Type**: `boolean | undefined`
- **Default**: `true` (zip is generated)
- **`false`**: Only the output directory is kept, no zip.

## Behavior

- **`true` or omitted**: After build, `{outDir}.zip` is created under [outputRoot](/guide/output), e.g. `.extenzo/dist.zip`.
- **`false`**: No zip file.

## Related

- [Build output](/guide/output): outDir determines the zip filename (`outDir.zip`).
