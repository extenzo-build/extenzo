import { describe, expect, it } from "@rstest/core";
import extenzoVuePlugin, { getVueRsbuildPlugins } from "../src/index.ts";

describe("plugin-vue", () => {
  it("extenzoVuePlugin returns plugin with name extenzo-vue", () => {
    const plugin = extenzoVuePlugin();
    expect(plugin.name).toBe("extenzo-vue");
    expect(plugin.setup).toBeDefined();
    expect(plugin.enforce).toBe("pre");
  });

  it("getVueRsbuildPlugins returns array", () => {
    const plugins = getVueRsbuildPlugins(process.cwd());
    expect(Array.isArray(plugins)).toBe(true);
  });
});
