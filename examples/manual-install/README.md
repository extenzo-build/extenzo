# 手动安装示例（VideoRoll-Pro + extenzo）

本示例将 [VideoRoll-Pro](https://github.com/gxy5202/video-roll) 的插件内容复制到此处，并改用 **extenzo** 进行构建与开发，便于在 extenzo 仓库内直接调试与参考。不会修改 VideoRoll-Pro 原仓库代码。

## 前置条件

- 本地存在 VideoRoll-Pro 项目，且与 extenzo 同级目录，例如：
  - `programs/extenzo`
  - `programs/VideoRoll-Pro`
- 若路径不同，可设置环境变量：`VIDEOROLL_PRO_PATH=/path/to/VideoRoll-Pro`

## 首次使用：复制源码

在 **extenzo 仓库根目录** 执行：

```bash
pnpm run setup:manual-install
```

或在当前示例目录执行：

```bash
pnpm run setup
```

脚本会将 VideoRoll-Pro 的 `src`、`public`、`types` 复制到本示例目录。

## 安装与运行

在 **本目录** `examples/manual-install` 下：

```bash
pnpm install
pnpm dev    # 开发模式（watch + 可选浏览器热重载）
pnpm build  # 生产构建，输出到 .extenzo/dist
```

构建产物在 `.extenzo/<outDir>/`（默认 `outDir` 为 `dist`，即 `.extenzo/dist`）。dev 与 build 共用该路径，watch 与浏览器热更新针对该目录。可在浏览器中通过「加载已解压的扩展程序」选择 `.extenzo/dist` 进行安装。

## Tailwind CSS

本示例使用 **Tailwind v3**（`tailwindcss` + `autoprefixer` 于 `postcss.config.mjs`，入口 CSS 使用 `@tailwind base/components/utilities`），便于在 build watch 下稳定开发。若改用 Tailwind v4（`@tailwindcss/postcss` + `@import "tailwindcss"`）后出现「一直重新构建」或输出目录下大量 `*.hot-update.js`，请确认使用最新版 extenzo（默认输出在 `.extenzo/dist`，可减少被 v4 自动扫描）（见 [@extenzo/cli docs/HMR_AND_WATCH.md](../../packages/cli/docs/HMR_AND_WATCH.md)）。

## 与 VideoRoll-Pro 原仓库的差异

- **构建工具**：由 Rsbuild 单项目改为 extenzo（基于 Rsbuild + 约定入口 + manifest 生成）。
- **配置**：使用 `ext.config.ts` 替代 `rsbuild.config.ts`。manifest 按 chromium/firefox 分别声明；通过 `plugins: [vue()]` 引入 Vue；通过 `extraPages: "video-roll"` 启用额外页面（由 plugin-entry 处理）；根目录下的 `public/` 会由框架自动整体复制到构建产物，无需在 `rsbuildConfig.output.copy` 中配置；项目级覆盖（如 alias、define）写在 `rsbuildConfig` 中。
- **脚本**：`dev` / `build` 改为调用 `extenzo dev` 与 `extenzo build`。

源码与资源（除上述配置与脚本外）与 VideoRoll-Pro 保持一致，便于对比与迁移。
