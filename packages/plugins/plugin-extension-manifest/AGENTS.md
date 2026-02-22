# AI usage (@extenzo/plugin-extension-manifest)

## Purpose

Rsbuild plugin that, after build, writes `dist/manifest.json` (chromium or firefox per CLI `-b` / browser param). Browser is passed from pipeline (config/constants), not from env.

## When to use

- Injected by **CLI pipeline**; users and examples do not reference it in exo.config
- When changing manifest generation logic, prefer changing `@extenzo/core`’s ManifestBuilder; this plugin only “writes the file” and “cleans HTML”

## Conventions

- Manifest content comes from `resolveManifestChromium(config, entries)` or `resolveManifestFirefox(config, entries)`
- Removed HTML paths: `dist/background/index.html`, `dist/content/index.html`, etc. (aligned with plugin-extension-entry output)

## When changing this package

- Do not implement manifest field logic here; keep it in core’s ManifestBuilder
