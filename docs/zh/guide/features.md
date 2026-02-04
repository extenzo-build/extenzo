# 功能简介

本节简要介绍 Extenzo 的功能子集，便于快速了解能做什么。

## 构建与输出

- **单配置多浏览器**：一份 `ext.config.ts`，通过 CLI 的 `-b chrome` / `-b firefox` 分别构建；manifest 可按 `chromium` / `firefox` 拆分。
- **输出目录**：默认输出到 `.extenzo/dist`（由 `outputRoot`、`outDir` 控制）；支持构建后打包为 zip（`zip: true`，默认开启）。

## 入口与目录

- **约定发现**：在根目录或 `srcDir` 下按目录名自动发现 `background`、`content`、`popup`、`options`、`sidepanel`、`devtools`。
- **自定义入口**：通过 `entry` 显式指定各入口路径；保留名不可改，其余可自定义（如 `capture`、`offscreen`）。
- **详见**：[entry](/config/entry)、[srcDir](/config/src-dir)。

## Manifest

- **三种方式**：在 config 中直接写 manifest 对象、按浏览器写路径（`manifest.chromium` / `manifest.firefox` 为字符串路径）、或省略后从 `srcDir` 自动加载 `manifest.json`、`manifest.chromium.json`、`manifest.firefox.json`。
- **详见**：[manifest](/config/manifest)。

## 插件与 Rsbuild

- **内置插件**：plugin-entry（入口与 HTML）、plugin-extension（写入 manifest）、plugin-hmr（开发 HMR），无需在 config 中声明。
- **用户插件**：`plugins: [vue()]`、`plugins: [react()]` 或其它 Rsbuild 插件。
- **Rsbuild 扩展**：`rsbuildConfig` 对象深度合并，或函数 `(base, helpers)` 完全控制；可配置 define、alias、额外插件等。
- **详见**：[plugins](/config/plugins)、[rsbuildConfig](/config/rsbuild-config)。

## 开发与环境

- **开发模式**：`extenzo dev` 启动 watch + HMR，可配置 `launch.chrome` / `launch.firefox` 自动打开浏览器并加载扩展。
- **环境变量**：根目录 `.env` 通过 Rsbuild loadEnv 注入；`envPrefix` 控制暴露给前端的变量前缀（如 `PUBLIC_`）。
- **详见**：[launch](/config/launch)、[envPrefix](/config/env-prefix)。

## 生命周期

- **hooks**：`afterCliParsed`、`afterConfigLoaded`、`beforeRsbuildConfig`、`beforeBuild`、`afterBuild`，在各阶段注入逻辑。
- **详见**：[hooks](/config/hooks)。
