# Error monitor (Monitor)

When running `extenzo dev --debug` (or setting `debug: true` in config), a **dev-only error monitor** is enabled: it collects runtime errors per entry and shows them in a Monitor panel, with options to copy as prompt, Ask ChatGPT, Ask Cursor, and toggle theme.

## Enabling

- **CLI**: `extenzo dev --debug` or `extenzo dev -d`
- **Config**: Set `debug: true` in `exo.config.ts`

## Behavior

- Errors from background, content, popup, options, etc. are collected and shown in the Monitor panel.
- The panel is provided by the built-in **plugin-extension-monitor**; you do not add it to `plugins`.

## Note

- Only active in **dev**; production builds do not include the Monitor.
