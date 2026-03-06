# @extenzo/create-extenzo-app

[中文](README-zh_CN.md) | English

---

Interactive scaffolder: generates an extenzo-based extension project from options (template, deps, exo.config, etc.).

- Commands: `create-extenzo-app` or `pnpm create extenzo-app`
- Output to cwd or a given directory

## Templates

Scaffold templates live at **repo root** in **`templates/`** (e.g. `template-vanilla-ts`, `template-react-ts`, `template-uno-ts`, etc.). The CLI downloads the chosen template from the GitHub repo tarball, so the repo must have `templates/` at root and committed. The npm package does not bundle templates; it fetches from GitHub at scaffold time.
