# @extenzo/core

[中文](README-zh_CN.md) | English

---

extenzo core: types, config loading, entry discovery/resolution, manifest building, errors and constants. Consumed by CLI and plugins; can be used directly in custom scripts.

- **defineConfig**: config helper, returns user config
- **ConfigLoader / resolveExtenzoConfig**: load exo.config and resolve to full config + entry list
- **EntryDiscoverer / EntryResolver**: discover entries from dirs or resolve from `entry` config
- **ManifestBuilder**: build per-browser manifest from config and entries
- **CliParser**: parse `extenzo dev|build [-l chrome|edge|brave|vivaldi|opera|santa|firefox]`
- **mergeRsbuildConfig**: deep-merge Rsbuild config
- **ExtenzoError / create*Error**: unified error type and factories
