# envPrefix

`envPrefix` specifies which **environment variable name prefixes** from `.env` are loaded and injected into **client code** (background, content, popup, options, etc.). The framework passes this to Rsbuild's `loadEnv`; only variables whose names start with one of the given prefixes are exposed as `process.env.*`, so you can avoid leaking secrets.

## Type and default

- **Type**: `string[] | undefined`
- **Default**: `['']` (empty prefix → **all** .env variables exposed)
- **Recommendation**: Use `['PUBLIC_']` (or similar) in production so only `PUBLIC_*` variables are exposed.

## Role

- Reads from `.env`, `.env.local`, `.env.[mode]` at project root.
- Only variables whose names start with one of the prefixes in envPrefix are injected into the build.
- Omitted or `['']` → all .env variables; `['PUBLIC_']` → only `PUBLIC_API_URL` etc., not `API_SECRET`.

## Examples

### Only PUBLIC_ prefix (recommended)

```ts
export default defineConfig({
  envPrefix: ["PUBLIC_"],
});
```

`.env`:

```properties
PUBLIC_API_URL=https://api.example.com
API_SECRET=do-not-expose
```

Only `process.env.PUBLIC_API_URL` is available in background/content/popup.

### Multiple prefixes

```ts
export default defineConfig({
  envPrefix: ["PUBLIC_", "VITE_"],
});
```

## Related

- [launch](/config/launch): Browser paths for dev; can also be set via .env `BROWSER_CHROME` / `BROWSER_FIREFOX` (not filtered by envPrefix).
