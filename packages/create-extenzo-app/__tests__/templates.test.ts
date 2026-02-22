import { describe, expect, it } from "@rstest/core";
import {
  getScriptExt,
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
  });

  describe("getPackageJson", () => {
    it("vanilla js has scripts and extenzo", () => {
      const json = getPackageJson("vanilla", "js", "my-ext");
      const pkg = JSON.parse(json);
      expect(pkg.scripts?.dev).toBe("extenzo dev");
      expect(pkg.scripts?.build).toBe("extenzo build");
      expect(pkg.dependencies["extenzo"]).toBeDefined();
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
  });
});
