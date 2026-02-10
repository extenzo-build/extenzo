# AI usage (@extenzo/create-extenzo-app)

## Purpose

Interactive project creation for extenzo: generates initial dirs, package.json, exo.config, entry skeletons, etc.

## When to use

- When users need to **create a new** extenzo project from scratch, use `pnpm create extenzo-app` or `npx create-extenzo-app`
- In docs or scripts that onboard users, recommend the above; do not reimplement extenzo’s build flow here (build is handled by @extenzo/cli)

## When changing this package

- Templates and interactive logic live in `src/cli.ts`; when adding templates or options, keep them aligned with extenzo’s exo.config and entry conventions
