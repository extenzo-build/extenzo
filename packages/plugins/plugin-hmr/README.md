# @extenzo/plugin-hmr

Rsbuild plugin: in dev, waits for dist then launches the browser (Chrome/Firefox) and optionally injects HMR reload script. Used by CLI dev command.

- Options: distPath, browser, chromePath/firefoxPath, wsPort, enableReload
- Injected by pipeline from config.launch and BROWSER
