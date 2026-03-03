# Reload Manager 插件

开发模式下，扩展重载由内置 **plugin-extension-hmr** 负责，无需额外配置。该插件会：

- 启动 WebSocket 服务，与已加载的扩展建立连接。
- 在每次构建完成后向扩展发送重载信号，触发浏览器扩展的 `chrome.runtime.reload()`（或 Firefox 等价行为）。
- 配合 [launch](/guide/launch) 在首次构建后自动打开浏览器并加载扩展目录。

## 与 HMR 的关系

- [热更新](/guide/hmr) 文档描述了整体流程；Reload Manager 即上述 WebSocket + 重载逻辑的实现方。
- 用户无需在 `exo.config.ts` 的 `plugins` 中声明，框架会在 dev 时自动注入。

## 自定义浏览器路径

若需指定 Chrome/Firefox 可执行文件路径，请配置 [launch](/guide/launch)。
