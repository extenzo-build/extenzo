# Environment variables (envPrefix)

`envPrefix` controls which environment variables from `.env` are injected into **client code** (background, content, popup, options). Only variable names starting with one of the given prefixes are exposed to `process.env`, to avoid leaking secrets.

## Type and default

- **Type**: `string[] | undefined`
- **Default**: `['']` (expose all variables from .env)
- **Recommendation**: Use `['PUBLIC_']` in production so only `PUBLIC_*` variables are injected.

## Example

```ts
export default defineConfig({
  envPrefix: ["PUBLIC_"],
});
```

Only `PUBLIC_*` variables from `.env` will be available in the extension code.
