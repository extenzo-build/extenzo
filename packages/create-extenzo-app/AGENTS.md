# AI usage (@extenzo/create-extenzo-app)

## Purpose

Interactive project creation for extenzo: downloads a pre-built template from the GitHub repo and scaffolds a ready-to-use extension project.

## When to use

- When users need to **create a new** extenzo project from scratch, use `pnpm create extenzo-app` or `npx create-extenzo-app`
- In docs or scripts that onboard users, recommend the above; do not reimplement extenzo's build flow here (build is handled by @extenzo/cli)

## When changing this package

- Interactive CLI logic lives in `src/cli.ts`; types and constants in `src/templates.ts`; download/extraction logic in `src/download.ts`
- Actual template files live at **repo root** `templates/template-{framework}-{language}/`; the CLI downloads from the GitHub tarball, so the repo must have `templates/` at root.
- When adding a new framework or option, create a corresponding `templates/template-{framework}-{language}/` at repo root and update `FRAMEWORKS` in `src/templates.ts`
