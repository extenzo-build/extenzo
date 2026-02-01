import { createRequire } from "module";
import { resolve } from "path";
import type { RsbuildPluginAPI } from "@rsbuild/core";

/**
 * Create require that resolves from app root so @rsbuild/* and @vue/babel-plugin-jsx
 * are found in the app's node_modules (e.g. examples/manual-install).
 */
function createAppRequire(appRoot: string) {
  return createRequire(resolve(appRoot, "package.json"));
}

/** Return Rsbuild plugins to prepend before extenzo-vue (so Vue/Babel are available before plugins init). */
export function getVueRsbuildPlugins(appRoot: string): unknown[] {
  const appRequire = createAppRequire(appRoot);
  try {
    const { pluginVue } = appRequire("@rsbuild/plugin-vue");
    const { pluginBabel } = appRequire("@rsbuild/plugin-babel");
    return [
      pluginBabel({
        include: /\.(?:jsx|tsx)$/,
        babelLoaderOptions: (
          opts: Record<string, unknown>,
          utils: { addPlugins?: (plugins: unknown[]) => void }
        ) => {
          if (typeof utils?.addPlugins === "function") {
            utils.addPlugins(["@vue/babel-plugin-jsx"]);
          } else {
            const list = (opts.plugins as unknown[]) ?? [];
            if (
              !list.some(
                (p) =>
                  (typeof p === "string" && p.includes("babel-plugin-jsx")) ||
                  (Array.isArray(p) && String(p[0]).includes("babel-plugin-jsx"))
              )
            ) {
              opts.plugins = [...list, "@vue/babel-plugin-jsx"];
            }
          }
          return opts;
        },
      }),
      pluginVue(),
      // pluginVueJsx(),
    ];
  } catch {
    return [];
  }
}

/**
 * Rsbuild plugin for Vue 3 + Vue JSX + Less + Babel.
 * Usage: import vue from "@extenzo/plugin-vue"; plugins: [vue()]
 */
export function extenzoVuePlugin() {
  return {
    name: "extenzo-vue",
    enforce: "pre" as const,
    setup() {
      // Vue/Babel plugins are injected by CLI via getVueRsbuildPlugins before createRsbuild.
    },
  };
}

export default extenzoVuePlugin;
