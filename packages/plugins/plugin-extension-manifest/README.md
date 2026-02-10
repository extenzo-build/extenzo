# @extenzo/plugin-extension-manifest

[中文](README-zh_CN.md) | English

---

Rsbuild plugin: after build, writes manifest.json (per-browser) and removes stray HTML for background/content. Injected by CLI pipeline.

- Uses `@extenzo/core`’s `resolveManifestChromium` / `resolveManifestFirefox`
- Writes manifest according to BROWSER env
