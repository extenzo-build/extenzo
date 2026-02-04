---
pageType: home
title: Extenzo
description: 基于 Rsbuild 的浏览器扩展开发框架
hero:
  name: Extenzo
  text: 基于 Rsbuild 的浏览器扩展开发框架
  tagline: 一套配置，支持 Chrome / Firefox；开发热更新，构建即用。
  image:
    src: /extenzo.png
    alt: Extenzo
  actions:
    - text: 快速开始
      link: /guide/install
      theme: brand
    - text: 配置说明
      link: /config/manifest
      theme: default
features:
  - title: 开发与生产一致
    details: 浏览器插件调试更复杂，因此采用 full bundle 模式减少环境差异；得益于 Rsbuild 性能，通过 build watch 热更新，一致体验且不丢构建性能。
    icon: 📦
  - title: 零配置起步
    details: 脚手架生成项目或安装 extenzo 后，在根目录添加 ext.config.ts 即可开始开发；支持 Vanilla / Vue / React。
    icon: 🚀
  - title: 双浏览器支持
    details: 同一套代码，通过 manifest 的 chromium / firefox 分支与 -b chrome | firefox 分别构建与开发。
    icon: 🌐
  - title: 开发体验
    details: extenzo dev 启动 watch + HMR，自动打开浏览器并加载扩展；每次构建后通过 WebSocket 触发重载。
    icon: ⚡
  - title: Rsbuild 驱动
    details: 底层使用 Rsbuild，可透传 rsbuildConfig 做深度定制（别名、define、插件等），与 Vite 式配置习惯一致。
    icon: 🔧
---

## 简介

Extenzo 是基于 [Rsbuild](https://rsbuild.dev/) 的浏览器扩展开发框架。我们采用 **full bundle** 模式并以 **build watch** 做热更新，保证开发与打包后的一致体验且不丢失构建性能。安装主包 **extenzo** 即可获得 CLI 与整套构建能力，通过 `ext.config.ts` 配置 manifest、入口、插件与 Rsbuild 扩展。

- **一条命令**：`extenzo dev` / `extenzo build`，支持 `-b chrome` 或 `-b firefox` 指定目标浏览器。
- **约定优于配置**：在项目根或 `srcDir` 下按约定放置 `background`、`content`、`popup`、`options`、`sidepanel`、`devtools` 等入口，或使用 `entry` 自定义。
- **插件化**：内置 plugin-entry、plugin-extension、plugin-hmr；用户通过 `plugins: [vue()]` 或 `plugins: [react()]` 接入 Vue/React。

## 导航

| 模块 | 说明 |
|------|------|
| [指南](/guide/introduction) | 介绍、安装、功能简介 |
| [配置](/config/manifest) | manifest、plugins、rsbuildConfig、entry、srcDir、outDir、outputRoot、zip、envPrefix、launch、hooks 等 |
| [示例](/examples/) | 仓库中各扩展示例的描述与链接 |
