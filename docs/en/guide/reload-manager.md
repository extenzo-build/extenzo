# Reload Manager plugin

In dev mode, extension reload is handled by the built-in **plugin-extension-hmr**: it starts a WebSocket and triggers `chrome.runtime.reload()` (or Firefox equivalent) after each build. No extra config is required.

## Relation to HMR

- [Hot reload](/guide/hmr) describes the flow; the Reload Manager is the implementation (WebSocket + reload).
- The plugin is injected automatically in dev; do not add it to `plugins`.

## Custom browser path

Configure [launch](/guide/launch) to set Chrome/Firefox executable paths.
