import { createRequire } from "module";
import { resolve } from "path";
import type { RsbuildPluginAPI } from "@rsbuild/core";

function createAppRequire(appRoot: string) {
  return createRequire(resolve(appRoot, "package.json"));
}

/** Return Rsbuild plugins to prepend before extenzo-react (so React is available before plugins init). */
export function getReactRsbuildPlugins(appRoot: string): unknown[] {
  const appRequire = createAppRequire(appRoot);
  try {
    const { pluginReact } = appRequire("@rsbuild/plugin-react");
    return [pluginReact()];
  } catch {
    return [];
  }
}

/**
 * Rsbuild plugin for React + JSX.
 * Usage: import react from "@extenzo/plugin-react"; plugins: [react()]
 */
export function extenzoReactPlugin() {
  return {
    name: "extenzo-react",
    setup(_api: RsbuildPluginAPI) {
      // React plugin is injected by CLI via getReactRsbuildPlugins before createRsbuild.
    },
  };
}

export default extenzoReactPlugin;
