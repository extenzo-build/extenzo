# debug

`debug` enables the **extension error monitor** in dev mode by adding the `@extenzo/rsbuild-plugin-extension-monitor` plugin. It surfaces runtime errors from the extension into a dedicated panel and terminal‑friendly output, designed to work well with AI assistants.

## Type and default

- **Type**: `boolean | undefined`
- **Default**: `false`
- **CLI equivalence**: CLI flag `--debug` is equivalent to `debug: true` in config for that run and has higher priority.

## Role

- When `debug` is `true` (or `--debug` is passed) **and the command is `extenzo dev`**:
  - The monitor plugin is injected into the Rsbuild pipeline.
  - Dev builds stream extension errors into:
    - a browser UI panel (overlay or dedicated page, depending on setup),
    - and terminal error blocks formatted for "Ask AI" workflows.
- When `debug` is `false` or omitted:
  - The monitor plugin is not added; dev behaves normally, without the extra error panel.
- Has **no effect** on `extenzo build`; the monitor is dev‑only.

## Examples

### Always enable monitor in dev via config

```ts
export default defineConfig({
  debug: true,
});
```

### Enable monitor only when needed via CLI

```bash
extenzo dev --debug
```

This does not require `debug` in config and is useful for temporary debugging sessions.

## Related

- CLI parser maps `--debug` to the same behaviour as `debug: true` in `exo.config`.
- Dev plugin [@extenzo/rsbuild-plugin-extension-monitor](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/rsbuild-plugin-extension-monitor).
