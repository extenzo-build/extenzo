export type Framework =
  | "vanilla"
  | "vue"
  | "react"
  | "preact"
  | "svelte"
  | "solid"
  | "uno";
export type Language = "js" | "ts";

const FRAMEWORK_CONFIG: Record<
  Exclude<Framework, "vanilla">,
  { importLine: string; pluginsLine: string }
> = {
  vue: {
    importLine: 'import vue from "@extenzo/plugin-vue";',
    pluginsLine: "plugins: [vue()],",
  },
  react: {
    importLine: 'import { pluginReact } from "@rsbuild/plugin-react";',
    pluginsLine: "plugins: [pluginReact()],",
  },
  preact: {
    importLine: 'import { pluginPreact } from "@rsbuild/plugin-preact";',
    pluginsLine: "plugins: [pluginPreact()],",
  },
  svelte: {
    importLine: 'import { pluginSvelte } from "@rsbuild/plugin-svelte";',
    pluginsLine: "plugins: [pluginSvelte()],",
  },
  solid: {
    importLine:
      'import { pluginBabel } from "@rsbuild/plugin-babel";\nimport { pluginSolid } from "@rsbuild/plugin-solid";',
    pluginsLine: "plugins: [pluginBabel({ include: /\\.(?:jsx|tsx)$/ }), pluginSolid()],",
  },
  uno: {
    importLine: 'import { pluginReact } from "@rsbuild/plugin-react";',
    pluginsLine: "plugins: [pluginReact()],",
  },
};

export function getScriptExt(lang: Language): string {
  return lang === "ts" ? ".ts" : ".js";
}

/** Extension for HTML entry script: .tsx/.jsx for React/Preact/Solid/Uno, else .ts/.js */
export function getEntryScriptExt(framework: Framework, lang: Language): string {
  if (framework === "react" || framework === "preact" || framework === "solid" || framework === "uno") {
    return lang === "ts" ? ".tsx" : ".jsx";
  }
  return getScriptExt(lang);
}

function getManifestConfigSnippet(): string {
  return `const manifest = {
  name: "My Extension",
  version: "1.0.0",
  manifest_version: 3,
  description: "Browser extension built with extenzo",
  permissions: ["storage", "activeTab"],
  action: {
    default_popup: "popup/index.html",
    default_icon: { 16: "/icons/icon_16.png", 48: "/icons/icon_48.png" },
  },
  options_ui: { page: "options/index.html", open_in_tab: true },
  background: { service_worker: "background/index.js" },
  content_scripts: [
    { matches: ["<all_urls>"], js: ["content/index.js"] },
  ],
};

`;
}

export function getConfigContent(framework: Framework, lang: Language): string {
  const cfg = framework === "vanilla" ? null : FRAMEWORK_CONFIG[framework];
  const importLine = cfg?.importLine ?? "";
  const pluginsLine = cfg?.pluginsLine ?? "";
  const manifestSnippet = getManifestConfigSnippet();
  return `import { defineConfig } from "extenzo";
${importLine}

${manifestSnippet}export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  ${pluginsLine}
});
`;
}

function getFrameworkDeps(
  framework: Framework
): { deps: Record<string, string>; devDeps: Record<string, string> } {
  const devDeps: Record<string, string> = {};
  const deps: Record<string, string> = {
    extenzo: "^0.1.0",
    "@rsbuild/core": "^1.6.0",
    "webextension-polyfill": "^0.10.0",
  };
  if (framework !== "vanilla") {
    deps["@extenzo/utils"] = "^0.1.0";
  }
  if (framework === "vue") {
    deps["vue"] = "^3.4.0";
    deps["@extenzo/plugin-vue"] = "^0.1.0";
    Object.assign(devDeps, {
      "@rsbuild/plugin-vue": "^1.2.0",
      "@rsbuild/plugin-vue-jsx": "^1.1.0",
      "@rsbuild/plugin-less": "^1.5.0",
      "@rsbuild/plugin-babel": "^1.0.6",
    });
  } else if (framework === "react" || framework === "uno") {
    deps["react"] = "^18.2.0";
    deps["react-dom"] = "^18.2.0";
    devDeps["@rsbuild/plugin-react"] = "^1.2.0";
    if (framework === "uno") {
      devDeps["unocss"] = "^0.62.0";
      devDeps["@unocss/postcss"] = "^0.62.0";
    }
  } else if (framework === "preact") {
    deps["preact"] = "^10.19.0";
    devDeps["@rsbuild/plugin-preact"] = "^1.2.0";
  } else if (framework === "svelte") {
    deps["svelte"] = "^4.2.0";
    devDeps["@rsbuild/plugin-svelte"] = "^1.1.0";
  } else if (framework === "solid") {
    deps["solid-js"] = "^1.8.0";
    devDeps["@rsbuild/plugin-babel"] = "^1.0.6";
    devDeps["@rsbuild/plugin-solid"] = "^1.0.7";
  }
  return { deps, devDeps };
}

export function getPackageJson(
  framework: Framework,
  lang: Language,
  targetDir: string
): string {
  const base: Record<string, unknown> = {
    name: targetDir.replace(/\s+/g, "-").toLowerCase(),
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "extenzo dev",
      build: "extenzo build",
    },
  };
  const { deps, devDeps } = getFrameworkDeps(framework);
  const allDevDeps = { ...devDeps };
  if (lang === "ts") {
    allDevDeps["typescript"] = "^5.0.0";
    if (framework !== "vanilla") {
      allDevDeps["@types/chrome"] = "^0.0.326";
      allDevDeps["@types/webextension-polyfill"] = "^0.10.0";
    }
    if (framework === "react" || framework === "uno") {
      allDevDeps["@types/react"] = "^18.2.0";
      allDevDeps["@types/react-dom"] = "^18.2.0";
    }
  }
  (base as Record<string, unknown>).dependencies = deps;
  (base as Record<string, unknown>).devDependencies = allDevDeps;
  return JSON.stringify(base, null, 2);
}
