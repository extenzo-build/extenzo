import { describe, expect, it } from "@rstest/core";
import type { ExtenzoResolvedConfig, EntryInfo } from "@extenzo/core";
import { ExtenzoMonitorPlugin, monitorPlugin } from "../src/index.ts";

function minimalConfig(manifest: ExtenzoResolvedConfig["manifest"]): ExtenzoResolvedConfig {
  return { manifest, appDir: "/app", outDir: "/out" } as ExtenzoResolvedConfig;
}

function minimalEntry(name: string): EntryInfo {
  return { name, scriptPath: `/${name}.ts`, htmlPath: `/${name}.html`, html: true };
}

describe("plugin-extension-monitor", () => {
  it("monitorPlugin returns plugin with name extenzo-monitor", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("popup")]);
    expect(plugin.name).toBe("extenzo-monitor");
    expect(plugin.setup).toBeDefined();
    expect(typeof plugin.setup).toBe("function");
  });

  it("monitorPlugin setup runs without error", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("popup")]);
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => fn({ source: { entry: {} } }),
      onBeforeCreateCompiler: () => {},
    };
    expect(() => plugin.setup!(api as never)).not.toThrow();
  });

  it("ExtenzoMonitorPlugin buildInjectionSnippet includes entry and setupExtenzoMonitor", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const instance = new ExtenzoMonitorPlugin(config, [minimalEntry("popup")]);
    const snippet = instance.buildInjectionSnippet("popup", { autoOpen: true, registerShortcut: false });
    expect(snippet).toContain("setupExtenzoMonitor");
    expect(snippet).toContain("popup");
    expect(snippet).toContain("autoOpen: true");
  });

  it("ExtenzoMonitorPlugin getInjectDataUrl returns data URL", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const instance = new ExtenzoMonitorPlugin(config, [minimalEntry("background")]);
    const url = instance.getInjectDataUrl("background", { autoOpen: false, registerShortcut: true });
    expect(url).toMatch(/^data:text\/javascript;charset=utf-8,/);
    expect(decodeURIComponent(url)).toContain("setupExtenzoMonitor");
  });

  it("injectPermissions adds commands and web_accessible_resources to single manifest", () => {
    const manifest = { name: "X", version: "1.0.0", manifest_version: 3 };
    const config = minimalConfig(manifest);
    const instance = new ExtenzoMonitorPlugin(config, []);
    instance.injectPermissions();
    expect(manifest.commands).toBeDefined();
    expect((manifest.commands as Record<string, unknown>)["open-extenzo-monitor"]).toBeDefined();
    expect(Array.isArray(manifest.web_accessible_resources)).toBe(true);
    expect((manifest.web_accessible_resources as { resources?: string[] }[])[0]?.resources).toContain(
      "extenzo-monitor/*"
    );
  });
});
