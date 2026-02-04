export type Framework = "vanilla" | "vue" | "react";
export type Language = "js" | "ts";

export function getScriptExt(lang: Language): string {
  return lang === "ts" ? ".ts" : ".js";
}

export function getConfigContent(framework: Framework, lang: Language): string {
  const importLine =
    framework === "vue"
      ? 'import vue from "@extenzo/plugin-vue";'
      : framework === "react"
        ? 'import { pluginReact } from "@rsbuild/plugin-react";'
        : "";
  const pluginsLine =
    framework === "vue"
      ? "plugins: [vue()],"
      : framework === "react"
        ? "plugins: [pluginReact()],"
        : "";
  return `import { defineConfig } from "extenzo";
${importLine}

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  // outputRoot 默认 ".extenzo"，构建产物在 .extenzo/dist
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    description: "Browser extension built with extenzo",
    permissions: ["storage", "activeTab"],
  },
  ${pluginsLine}
  // 需要覆盖 Rsbuild 配置时使用 rsbuildConfig（对象会深度合并，函数则完全控制）
  // rsbuildConfig: (config) => config,
});
`;
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
  const deps: Record<string, string> = { extenzo: "^0.1.0", "@rsbuild/core": "^1.6.0" };
  if (framework === "vue") {
    deps["vue"] = "^3.4.0";
    deps["@extenzo/plugin-vue"] = "^0.1.0";
    (base as Record<string, unknown>).devDependencies = {
      "@rsbuild/plugin-vue": "^1.2.0",
      "@rsbuild/plugin-vue-jsx": "^1.1.0",
      "@rsbuild/plugin-less": "^1.5.0",
      "@rsbuild/plugin-babel": "^1.0.6",
    };
  }
  if (framework === "react") {
    deps["react"] = "^18.2.0";
    deps["react-dom"] = "^18.2.0";
    (base as Record<string, unknown>).devDependencies = {
      ...((base as Record<string, unknown>).devDependencies as Record<string, string> ?? {}),
      "@rsbuild/plugin-react": "^1.2.0",
    };
  }
  if (lang === "ts") {
    (base as Record<string, unknown>).devDependencies = {
      ...((base as Record<string, unknown>).devDependencies as Record<string, string> ?? {}),
      typescript: "^5.0.0",
    };
  }
  (base as Record<string, unknown>).dependencies = deps;
  return JSON.stringify(base, null, 2);
}
