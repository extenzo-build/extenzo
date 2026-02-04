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
    details: Full-bundle mode minimizes the dev/prod gap; thanks to Rsbuild, build watch gives hot reload with consistent output and no loss of build speed.
    icon: 📦
  - title: Zero-config start
    details: Scaffold a project or install extenzo, add ext.config.ts at the root, and start; Vanilla / Vue / React supported.
    icon: 🚀
  - title: Dual browser support
    details: Same codebase; use manifest chromium/firefox branches and -b chrome | firefox for build and dev.
    icon: 🌐
  - title: Dev experience
    details: extenzo dev runs watch + HMR, opens the browser and loads the extension; WebSocket triggers reload after each build.
    icon: ⚡
  - title: Rsbuild-powered
    details: Built on Rsbuild; pass rsbuildConfig for define, alias, plugins, etc., Vite-style config.
    icon: 🔧
---

## Introduction

Extenzo is a browser extension development framework built on [Rsbuild](https://rsbuild.dev/). We use **full-bundle mode** and **build watch** for hot reload, so dev and production behave the same without sacrificing build speed. Install the **extenzo** package to get the CLI and full build pipeline; configure manifest, entry, plugins, and Rsbuild via `ext.config.ts`.

- **One command**: `extenzo dev` / `extenzo build`, with `-b chrome` or `-b firefox` for target browser.
- **Convention over config**: Place `background`, `content`, `popup`, `options`, `sidepanel`, `devtools` under the root or `srcDir`, or use `entry` to customize.
- **Plugin-based**: Built-in plugin-entry, plugin-extension, plugin-hmr; add Vue/React with `plugins: [vue()]` or `plugins: [react()]`.

## Navigation

| Section | Description |
|---------|-------------|
| [Guide](/guide/introduction) | Introduction, Installation, Features overview |
| [Config](/config/manifest) | manifest, plugins, rsbuildConfig, entry, srcDir, outDir, outputRoot, zip, envPrefix, launch, hooks |
| [Examples](/examples/) | Example extensions with descriptions and repo links |
