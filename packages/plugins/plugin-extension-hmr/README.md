# @extenzo/plugin-extension-hmr

[中文](README-zh_CN.md) | English

---

Rsbuild plugin: in dev, waits for dist then launches the browser (Chrome/Firefox) and optionally injects HMR reload script. Used by CLI dev command.

- Options: distPath, browser, chromePath/firefoxPath, wsPort, enableReload
- **Browser launch**: [web-ext run](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-run) for both Chrome (`--target=chromium`) and Firefox (`--target=firefox-desktop`). Reload manager extension + WebSocket remain for build-triggered reload.
- Injected by pipeline from config.launch and BROWSER
