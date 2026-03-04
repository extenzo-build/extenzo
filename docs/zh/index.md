---
pageType: home
title: Extenzo
description: 浏览器插件开发框架
hero:
  name: Extenzo
  text: 加速你的浏览器插件开发
  tagline: 基于Rsbuild，快速，简单，自由
  image:
    src: /extenzo.png
    alt: Extenzo
  actions:
    - text: 快速开始
      link: /guide/install
features:
  - title: 一流的开发与生产体验
    details: 底层基于Rsbuild。Full bundle 模式保证开发与打包体验一致且不丢失极致的性能。
    icon: 📦
  - title: 框架无关
    details: 你可以用不使用任何框架，也可以使用Vue、React、Svelte、Solid、Preact等框架
    icon: 📦
  - title: 极简的配置
    details: 安装 extenzo 后，在根目录添加 exo.config.ts 即可开始，无需复杂的配置即可完成插件开发。
    icon: 🚀
  - title: 全方位的浏览器支持
    details: 支持多达6种基于Chromium的浏览器和Firefox。无需配置即可自动识别浏览器默认安装地址并启动。
    icon: 🌐
  - title: 无感热更新
    details: 使用独立插件控制插件更新，不仅快速，content_script和background均能实现无感热更新。
    icon: ⚡
  - title: 支持content-ui
    details: 提供了内置的createContentUI方法，可轻松集成Iframe/ShadowDom和原生内容
    icon: 📄
  - title: AI友好的错误监控
    details: 使用 --debug 时启用终端错误输出。无需在浏览器操作即可掌握插件所有报错信息，方便你在任何Editor中直接Ask AI。
    icon: 🐛
  - title: 支持打包zip
    details: 使用build将自动打包zip格式的文件
    icon: 🐛
  - title: 自由度极高
    details: 支持基于文件自动识别入口，也支持通过entry字段配置入口。最大程度为复杂项目提供灵活性。
    icon: 🐛
---

## 简介

Extenzo 是基于 [Rsbuild](https://rsbuild.dev/) 的浏览器扩展开发框架。我们采用 **full bundle** 模式并以 **build watch** 做热更新，保证开发与打包后的一致体验且不丢失构建性能。安装主包 **extenzo** 即可获得 CLI 与整套构建能力，通过 `exo.config.ts` 配置 manifest、入口、插件与 Rsbuild 扩展。

- **一条命令**：`extenzo dev` / `extenzo build`，支持 `-l chrome|edge|brave|vivaldi|opera|santa|firefox` 指定目标浏览器；`--debug` 在开发时启用错误监控面板。
- **约定优于配置**：在项目根或 `appDir` 下按约定放置 `background`、`content`、`popup`、`options`、`sidepanel`、`devtools` 等入口，或使用 `entry` 自定义。
- **Manifest 占位符**：在 content_scripts 的 `js`、`css` 中使用 `[exo.content]`，框架自动填入实际产出路径并移除空 `css`。
- **插件化**：内置 plugin-entry、plugin-extension、plugin-extension-hmr（及 debug 时的 monitor）；用户通过 `plugins: [vue()]` 或 `plugins: [react()]` 接入 Vue/React。

## 导航

| 模块 | 说明 |
|------|------|
| [指南](/guide/introduction) | 介绍、安装、功能简介 |
| [配置](/config/manifest) | manifest、plugins、rsbuildConfig、entry、appDir、outDir、outputRoot、zip、envPrefix、launch、hooks 等 |
| [示例](/examples/) | 仓库中各扩展示例的描述与链接 |
