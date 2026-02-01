# AI usage (@extenzo/cli)

## Purpose

Provides the `extenzo` executable: when running `extenzo dev` or `extenzo build` from project root, this package parses argv, loads config, builds Rsbuild config and starts the build.

## When to use

- Users **running extenzo from the CLI** install this package (or a meta package that depends on its bin)
- To **reuse extenzo’s build flow in scripts or tools**, use `runPipeline` from `@extenzo/core` (exported from core and used in cli’s pipeline) instead of spawning an `extenzo` subprocess

## Flow summary

1. Check that ext.config.ts/js/mjs exists in cwd
2. Parse argv → command (dev/build), browser (chromium/firefox)
3. ConfigLoader.resolve → config, entries
4. Build Rsbuild config (entry plugin, extension plugin, HMR plugin, user plugins/rsbuildConfig)
5. If enabled, wrap stdout/stderr with `[extenzo]` prefix via `wrapExtenzoOutput`
6. Run Rsbuild build (watch in dev)

## When changing this package

- New commands or flags require updates in `cli.ts` and `@extenzo/core`’s CliParser/constants
- Pipeline order or plugin injection lives in `pipeline.ts`; keep plugin-entry, plugin-extension, plugin-hmr contracts in mind
