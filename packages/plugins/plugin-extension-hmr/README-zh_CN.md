# @extenzo/plugin-extension-hmr

[English](README.md) | 中文

---

Rsbuild 插件：dev 模式下等待 dist 就绪后启动浏览器（Chrome/Firefox），并可注入 HMR 重载脚本。由 CLI dev 命令使用。

- 选项：distPath、browser、chromePath/firefoxPath、wsPort、enableReload
- **浏览器启动**：Chrome 与 Firefox 均通过 [web-ext run](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-run) 启动。重载管理扩展与 WebSocket 用于构建触发的重载。
- 由 pipeline 根据 config.launch 与 BROWSER 注入
