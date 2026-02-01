# AI usage (@extenzo/plugin-hmr)

## Purpose

Rsbuild plugin for **dev mode**: after dist is ready, launches Chrome or Firefox and loads the extension; optionally enables HMR reload (WebSocket + injected script).

## When to use

- Injected by **CLI pipeline** in dev; users set browser path via ext.config `launch.chrome` / `launch.firefox` or env (BROWSER_CHROME / BROWSER_FIREFOX)
- If reusing extenzo’s dev flow in a custom script, inject this plugin and pass distPath, browser, etc.

## Conventions

- Browser path: prefer config.launch, then env BROWSER_CHROME / BROWSER_FIREFOX
- HMR port etc. aligned with core’s HMR_WS_PORT

## When changing this package

- This plugin only handles “launch browser” and “HMR”; build is done by Rsbuild and plugin-entry/plugin-extension
