import { describe, expect, it } from "@rstest/core";
import extenzoVuePlugin, { getVueRsbuildPlugins } from "../src/index.ts";

describe("plugin-vue", () => {
  it("getVueRsbuildPlugins returns empty array when require throws", () => {
    const throwingRequire = () => {
      throw new Error("MODULE_NOT_FOUND");
    };
    const plugins = getVueRsbuildPlugins("/any", throwingRequire as never);
    expect(plugins).toEqual([]);
  });

  it("extenzoVuePlugin returns plugin with name extenzo-vue", () => {
    const plugin = extenzoVuePlugin();
    expect(plugin.name).toBe("extenzo-vue");
    expect(plugin.setup).toBeDefined();
    expect(plugin.enforce).toBe("pre");
  });

  it("extenzoVuePlugin setup runs without error", () => {
    const plugin = extenzoVuePlugin();
    expect(() => plugin.setup!({} as never)).not.toThrow();
  });

  it("getVueRsbuildPlugins returns [pluginBabel, pluginVue, pluginVueJsx] when deps available", () => {
    const plugins = getVueRsbuildPlugins(process.cwd());
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBe(3);
    expect(typeof (plugins[0] as { name?: string })?.name).toBe("string");
    expect(typeof (plugins[1] as { name?: string })?.name).toBe("string");
    expect(typeof (plugins[2] as { name?: string })?.name).toBe("string");
  });
});
