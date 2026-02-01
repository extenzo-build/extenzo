# @extenzo/cli

extenzo CLI entry: parses argv, runs pipeline (load config → build Rsbuild config), wraps output with prefix, and runs Rsbuild for `dev` / `build`.

- Commands: `extenzo dev`, `extenzo build [-b chrome|firefox]`
- Depends on `@extenzo/core` for config and entry resolution; depends on plugins for Rsbuild logic

See [docs/HMR_AND_WATCH.md](docs/HMR_AND_WATCH.md) for why HMR is disabled in dev (build watch) and how Tailwind/PostCSS interacts with watch mode.
