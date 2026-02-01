# @extenzo/plugin-entry

Rsbuild plugin: configures multi-entry, HTML templates and public copy from extenzo’s resolved entry list. Injected by CLI pipeline; users do not configure it directly.

- Multi-entry: popup, options, content, background, sidepanel, devtools and custom entry
- HTML: generates HTML for entries with htmlPath; strips local script tags so Rsbuild injects them
- Copies `public/` to dist when present
