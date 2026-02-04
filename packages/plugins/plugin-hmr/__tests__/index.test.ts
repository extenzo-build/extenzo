import { describe, expect, it } from "@rstest/core";
import { hmrPlugin, notifyReload } from "../src/index.ts";

describe("plugin-hmr", () => {
  it("hmrPlugin returns plugin with name extenzo-hmr", () => {
    const plugin = hmrPlugin({
      distPath: "/tmp/dist",
      wsPort: 23333,
    });
    expect(plugin.name).toBe("extenzo-hmr");
    expect(plugin.apply).toBeDefined();
    expect(typeof plugin.apply).toBe("function");
  });

  it("notifyReload does not throw when no server", () => {
    expect(() => notifyReload()).not.toThrow();
  });
});
