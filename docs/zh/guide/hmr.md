# 热更新（HMR）

`extenzo dev` 使用 **build watch** 方式：每次源码变更后重新构建，再通过 WebSocket 通知浏览器扩展重载，实现开发时的热更新体验。

## 机制说明

- **构建**：Rsbuild 以 watch 模式运行，产物输出到 [output](/guide/output) 目录（默认 `.extenzo/dist`）。
- **重载**：由内置 **plugin-extension-hmr** 在开发时注入，启动 WebSocket 服务；构建完成后向已连接的扩展页面发送重载指令，浏览器扩展自动 reload。
- **浏览器启动**：首次构建完成后，可根据 [launch](/guide/launch) 配置自动打开 Chrome/Firefox 并加载扩展。

## 使用方式

直接运行：

```bash
extenzo dev
```

可选指定浏览器：`extenzo dev -l chrome` 或 `extenzo dev -l firefox`。

## 注意

- 仅 **dev** 命令会启用 HMR 与 WebSocket；**build** 不会。
- 与 Vite 的 HMR 不同，extenzo 采用「全量重建 + 扩展重载」，保证开发与生产构建一致。
