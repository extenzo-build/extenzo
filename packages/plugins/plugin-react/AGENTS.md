# AI usage (@extenzo/plugin-react)

## Purpose

Enables **React + JSX** for extenzo projects. Users add `plugins: [react()]` in ext.config; CLI injects @rsbuild/plugin-react before build; this package provides a placeholder plugin for a consistent config API.

## When to use

- When the user project uses **React** for popup/options/sidepanel etc., in ext.config: `import react from "@extenzo/plugin-react"; export default defineConfig({ ..., plugins: [react()] })`
- Do not implement JSX compilation etc. in this package; that is done by @rsbuild/plugin-react; this package is only the config entry

## When changing this package

- CLI pipeline injects @rsbuild/plugin-react via `getReactRsbuildPlugins(appRoot)`; this plugin can be a no-op and only needs a name for recognition
