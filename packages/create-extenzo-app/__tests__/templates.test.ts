import { describe, expect, it } from "@rstest/core";
import {
  getScriptExt,
  getEntryScriptExt,
  getConfigContent,
  getPackageJson,
} from "../src/templates.ts";

describe("templates", () => {
  describe("getScriptExt", () => {
    it("returns .ts for ts", () => {
      expect(getScriptExt("ts")).toBe(".ts");
    });
    it("returns .js for js", () => {
      expect(getScriptExt("js")).toBe(".js");
    });
  });

  describe("getConfigContent", () => {
    it("vanilla js has defineConfig and no plugins line", () => {
      const content = getConfigContent("vanilla", "js");
      expect(content).toContain("defineConfig");
      expect(content).not.toContain("plugins: [vue()]");
      expect(content).not.toContain("plugins: [pluginReact()]");
    });
    it("includes full manifest with action, options_ui, background, content_scripts", () => {
      const content = getConfigContent("vanilla", "js");
      expect(content).toContain("chromium: manifest");
      expect(content).toContain("firefox: { ...manifest }");
      expect(content).toContain("default_popup: \"popup/index.html\"");
      expect(content).toContain("options_ui:");
      expect(content).toContain("service_worker: \"background/index.js\"");
      expect(content).not.toContain("appDir:");
      expect(content).not.toContain("outDir:");
    });
    it("vue ts has vue import and plugins: [vue()]", () => {
      const content = getConfigContent("vue", "ts");
      expect(content).toContain('import vue from "@extenzo/plugin-vue"');
      expect(content).toContain("plugins: [vue()]");
    });
    it("react js has pluginReact import and plugins: [pluginReact()]", () => {
      const content = getConfigContent("react", "js");
      expect(content).toContain('import { pluginReact } from "@rsbuild/plugin-react"');
      expect(content).toContain("plugins: [pluginReact()]");
    });
    it("preact ts has pluginPreact import and plugins", () => {
      const content = getConfigContent("preact", "ts");
      expect(content).toContain('import { pluginPreact } from "@rsbuild/plugin-preact"');
      expect(content).toContain("plugins: [pluginPreact()]");
    });
    it("svelte ts has pluginSvelte import and plugins", () => {
      const content = getConfigContent("svelte", "ts");
      expect(content).toContain('import { pluginSvelte } from "@rsbuild/plugin-svelte"');
      expect(content).toContain("plugins: [pluginSvelte()]");
    });
    it("solid ts has pluginBabel and pluginSolid", () => {
      const content = getConfigContent("solid", "ts");
      expect(content).toContain('import { pluginBabel } from "@rsbuild/plugin-babel"');
      expect(content).toContain('import { pluginSolid } from "@rsbuild/plugin-solid"');
      expect(content).toContain("pluginSolid()");
    });
    it("uno ts has pluginReact like react", () => {
      const content = getConfigContent("uno", "ts");
      expect(content).toContain('import { pluginReact } from "@rsbuild/plugin-react"');
      expect(content).toContain("plugins: [pluginReact()]");
    });
  });

  describe("getEntryScriptExt", () => {
    it("returns .tsx for react with ts", () => {
      expect(getEntryScriptExt("react", "ts")).toBe(".tsx");
    });
    it("returns .jsx for react with js", () => {
      expect(getEntryScriptExt("react", "js")).toBe(".jsx");
    });
    it("returns .ts for vanilla with ts", () => {
      expect(getEntryScriptExt("vanilla", "ts")).toBe(".ts");
    });
    it("returns .tsx for uno with ts", () => {
      expect(getEntryScriptExt("uno", "ts")).toBe(".tsx");
    });
  });

  describe("getPackageJson", () => {
    it("vanilla js has scripts and extenzo and webextension-polyfill", () => {
      const json = getPackageJson("vanilla", "js", "my-ext");
      const pkg = JSON.parse(json);
      expect(pkg.scripts?.dev).toBe("extenzo dev");
      expect(pkg.scripts?.build).toBe("extenzo build");
      expect(pkg.dependencies["extenzo"]).toBeDefined();
      expect(pkg.dependencies["webextension-polyfill"]).toBeDefined();
    });
    it("uses targetDir for name", () => {
      const json = getPackageJson("vanilla", "js", "my-extension");
      const pkg = JSON.parse(json);
      expect(pkg.name).toBe("my-extension");
    });
    it("vue includes vue and plugin-vue", () => {
      const json = getPackageJson("vue", "js", "my-ext");
      const pkg = JSON.parse(json);
      expect(pkg.dependencies.vue).toBeDefined();
      expect(pkg.dependencies["@extenzo/plugin-vue"]).toBeDefined();
    });
    it("react includes react and @rsbuild/plugin-react", () => {
      const json = getPackageJson("react", "ts", "my-ext");
      const pkg = JSON.parse(json);
      expect(pkg.dependencies.react).toBeDefined();
      expect(pkg.devDependencies["@rsbuild/plugin-react"]).toBeDefined();
      expect(pkg.devDependencies.typescript).toBeDefined();
    });
    it("preact includes preact and @rsbuild/plugin-preact", () => {
      const json = getPackageJson("preact", "ts", "my-ext");
      const pkg = JSON.parse(json);
      expect(pkg.dependencies.preact).toBeDefined();
      expect(pkg.devDependencies["@rsbuild/plugin-preact"]).toBeDefined();
    });
    it("svelte includes svelte and @rsbuild/plugin-svelte", () => {
      const json = getPackageJson("svelte", "ts", "my-ext");
      const pkg = JSON.parse(json);
      expect(pkg.dependencies.svelte).toBeDefined();
      expect(pkg.devDependencies["@rsbuild/plugin-svelte"]).toBeDefined();
    });
    it("solid includes solid-js and plugin-solid", () => {
      const json = getPackageJson("solid", "ts", "my-ext");
      const pkg = JSON.parse(json);
      expect(pkg.dependencies["solid-js"]).toBeDefined();
      expect(pkg.devDependencies["@rsbuild/plugin-solid"]).toBeDefined();
    });
    it("uno includes react, unocss and @unocss/postcss", () => {
      const json = getPackageJson("uno", "ts", "my-ext");
      const pkg = JSON.parse(json);
      expect(pkg.dependencies.react).toBeDefined();
      expect(pkg.devDependencies["@rsbuild/plugin-react"]).toBeDefined();
      expect(pkg.devDependencies.unocss).toBeDefined();
      expect(pkg.devDependencies["@unocss/postcss"]).toBeDefined();
    });
  });
});
