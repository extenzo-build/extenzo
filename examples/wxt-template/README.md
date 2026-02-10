# WXT 浏览器扩展示例

本示例为**纯 WXT** 实现的浏览器扩展，不依赖 extenzo。**功能与 [vue-template](../vue-template) 完全一致**（Vue 弹窗/选项页、Ping Background、Send to Content、content 展示来自 popup 的消息、options 的 nickname 存储），仅构建工具为 WXT 而非 extenzo。

## 技术栈

- [WXT](https://wxt.dev/)：基于 Vite 的浏览器扩展框架
- Vue 3 + TypeScript
- 入口：background、popup、options、content script

## 目录结构

```
entrypoints/
  background.ts     # Service Worker（PING / RELAY_TO_CONTENT）
  content.ts        # Content Script（FROM_BACKGROUND，注入 extenzo-content-root）
  popup/
    index.html
    main.ts
    App.vue
    style.css
  options/
    index.html
    main.ts
    App.vue
wxt.config.ts
tsconfig.json       # 继承 .wxt/tsconfig.json（需先执行 pnpm install）
```

## 使用

```bash
# 安装依赖（会执行 wxt prepare 生成 .wxt 等）
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 打包 zip（用于商店提交）
pnpm zip
```

## 与 extenzo 的区别

| 项目     | extenzo 示例        | 本示例 (WXT)        |
|----------|---------------------|---------------------|
| 构建     | Rsbuild             | Vite (WXT 内置)     |
| 配置     | exo.config.ts       | wxt.config.ts       |
| 入口约定 | app/*/index.html+script | entrypoints/*      |
| Manifest | 手写 manifest 对象  | 由 entrypoints 与 config 生成 |

本目录为独立 WXT 项目，在 extenzo 仓库中仅作参考，运行与构建均不经过 extenzo。
