# @extenzo/plugin-extension-manifest

[English](README.md) | 中文

---

Rsbuild 插件：构建结束后写入 manifest.json（按浏览器），并移除 background/content 产生的多余 HTML。由 CLI 流水线注入。

- 使用 `@extenzo/core` 的 `resolveManifestChromium` / `resolveManifestFirefox`
- 按 BROWSER 环境变量写入 manifest
