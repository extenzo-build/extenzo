# AI usage (@extenzo/plugin-extension-entry)

## Purpose

Rsbuild plugin that configures multi-entry, HTML output paths and public copy from `ExtenzoResolvedConfig` and `EntryInfo[]`. Injected by `@extenzo/cli` pipeline; users do not reference it in exo.config.

## When to use

- **Extension dev**: use framework plugins in exo.config (e.g. `plugins: [react()]`); this plugin is injected by CLI
- **Changing extenzo build**: when editing pipeline or this plugin, keep entry names and output paths in sync with `@extenzo/core`’s `MANIFEST_ENTRY_PATHS` and `EntryInfo`

## Conventions

- Entry key = entry name, value = scriptPath (absolute or relative)
- Entries with htmlPath get HTML; output path is determined by `buildFilenameMap` (popup/options/sidepanel/devtools etc.)
- Do not hardcode entry name lists in this plugin; use core constants or the passed entries

## When changing this package

- When adding entry types or output paths, update `@extenzo/core` constants and ManifestBuilder
