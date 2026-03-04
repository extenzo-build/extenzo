---
pageType: home
title: Extenzo
description: Browser extension development framework built on Rsbuild
hero:
  name: Extenzo
  text: Browser extension development framework built on Rsbuild
  tagline: One config for Chrome and Firefox; dev with HMR, build and ship.
  image:
    src: /extenzo.png
    alt: Extenzo
  actions:
    - text: Get Started
      link: /guide/install
      theme: brand
    - text: Config
      link: /config/manifest
      theme: default
features:
  - title: Same experience in dev and production
    details: Full-bundle mode minimizes the dev/prod gap; Rsbuild + build watch give hot reload with consistent output and no loss of build speed.
    icon: 📦
  - title: Zero-config start
    details: Scaffold a project or install extenzo, add exo.config.ts at the root, and start; Vanilla, Vue, and React supported.
    icon: 🚀
  - title: Dual browser support
    details: One codebase; manifest chromium/firefox branches and CLI -l chrome | edge | brave | vivaldi | opera | santa | firefox for build and dev.
    icon: 🌐
  - title: HMR and launch
    details: extenzo dev runs watch + HMR, opens the browser and loads the extension; WebSocket triggers reload after each build.
    icon: ⚡
  - title: Manifest placeholders
    details: Use [exo.content] in content_scripts js and css; the framework fills real output paths (multiple js/css supported) and removes empty css.
    icon: 📄
  - title: Debug error monitor
    details: With --debug, a dev-only error panel shows errors per entry, Ask AI (Copy prompt, ChatGPT, Cursor), and light/dark theme toggle.
    icon: 🐛
---

## Introduction

Extenzo is a browser extension development framework built on [Rsbuild](https://rsbuild.dev/). We use **full-bundle mode** and **build watch** for hot reload, so dev and production behave the same without sacrificing build speed. Install the **extenzo** package to get the CLI and full build pipeline; configure manifest, entry, plugins, and Rsbuild via `exo.config.ts`.

- **One command**: `extenzo dev` / `extenzo build`, with `-l chrome|edge|brave|vivaldi|opera|santa|firefox` for target browser; `--debug` enables the error monitor in dev.
- **Convention over config**: Place `background`, `content`, `popup`, `options`, `sidepanel`, `devtools` under the root or `appDir`, or use `entry` to customize.
- **Manifest placeholders**: Use `[exo.content]` in content_scripts `js` and `css`; the framework fills real output paths and drops empty `css`.
- **Plugin-based**: Built-in plugin-extension-entry, plugin-extension-manifest, plugin-extension-hmr (and monitor when debug); add Vue/React with `plugins: [vue()]` or `plugins: [react()]`.

## Navigation

| Section | Description |
|---------|-------------|
| [Guide](/guide/introduction) | Introduction, Installation, Features overview |
| [Config](/config/manifest) | manifest, plugins, rsbuildConfig, entry, appDir, outDir, outputRoot, zip, envPrefix, launch, hooks |
| [Examples](/examples/) | Example extensions with descriptions and repo links |
