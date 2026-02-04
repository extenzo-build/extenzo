# FFmpeg Worker 示例

本示例演示在 extenzo 扩展中：

- 使用 **extenzo** 的 `ext.config.ts` 配置入口与 manifest
- 在 **popup** 中点击按钮，打开新标签页加载 **videopanel.html**
- 在 **videopanel** 页面中使用 **ffmpeg.wasm**（通过 Web Worker）实现简单功能：加载 FFmpeg 后执行 `ffmpeg -version` 并显示日志

## 配置要点（ext.config.ts）

- `entry.videopanel`: 自定义入口 `videopanel/videopanel.html`，构建后为 `videopanel/videopanel.html`
- `manifest`: popup、background，无 content/options
- 使用 CDN（jsdelivr）+ `@ffmpeg/util` 的 `toBlobURL` 加载 ffmpeg-core，避免 CORS；FFmpeg 在库内部通过 Worker 运行

## 运行

```bash
pnpm install
pnpm dev    # 开发模式
pnpm build  # 构建
```

在浏览器中加载 `dist`（或 `.extenzo/dist`）为解压扩展，点击扩展图标打开 popup，点击「打开 Video Panel」即可在新标签页使用 FFmpeg WASM。
