# persist

`persist` controls whether **Chromium-based browsers reuse a dev user data directory** between `extenzo dev` runs. It affects only dev mode and only Chromium‑family browsers.

## Type and default

- **Type**: `boolean | undefined`
- **Default**: `false`
- **CLI precedence**: `-p/--persist` on the CLI has **higher priority** than config and always enables persistence for that run.

## Role

- When `true` (or CLI `--persist` is used):
  - Dev mode **persists** a Chromium user data dir under the internal cache path, so:
    - extension install state
    - extension settings
    - login sessions and cookies
    are kept between `extenzo dev` runs.
- When `false`:
  - Each `extenzo dev` run uses a fresh temporary profile for Chromium‑based browsers.
- Does not affect Firefox; Firefox profile handling is delegated to `web-ext`.

## Examples

### Enable persistence via config

```ts
export default defineConfig({
  persist: true,
});
```

### One‑off persistence via CLI

```bash
extenzo dev --persist
# or
extenzo dev -p
```

This overrides any `persist` value in config for that run.

## Related

- Dev plugin [@extenzo/rsbuild-plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/rsbuild-plugin-extension-hmr) which uses the persisted profile.
