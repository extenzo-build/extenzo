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
  it("monitorPlugin returns plugin with name rsbuild-plugin-extension-monitor", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("popup")]);
    expect(plugin.name).toBe("rsbuild-plugin-extension-monitor");
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
    const snippet = instance.buildInjectionSnippet("popup", { registerShortcut: false });
    expect(snippet).toContain("setupExtenzoMonitor");
    expect(snippet).toContain("popup");
    expect(snippet).toContain("entry:");
  });

  it("ExtenzoMonitorPlugin buildInjectionSnippet for background includes startHmrReloadClient", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const instance = new ExtenzoMonitorPlugin(config, [minimalEntry("background")]);
    const snippet = instance.buildInjectionSnippet("background", { registerShortcut: true });
    expect(snippet).toContain("startHmrReloadClient");
  });

  it("modifyRsbuildConfig prepends virtual module id to each entry import array", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const instance = new ExtenzoMonitorPlugin(config, [minimalEntry("background"), minimalEntry("content")]);
    const cfg = {
      source: {
        entry: {
          background: "/app/background.ts",
          content: "/app/content.ts",
        },
      },
    };
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => {
        fn(cfg);
        const src = (cfg as Record<string, unknown>).source as Record<string, unknown>;
        const entry = src.entry as Record<string, unknown>;
        expect(entry.background).toEqual({
          import: ["./.extenzo-monitor-background.js", "/app/background.ts"],
          html: false,
        });
        expect(entry.content).toEqual({
          import: ["./.extenzo-monitor-content.js", "/app/content.ts"],
          html: false,
        });
      },
      onBeforeCreateCompiler: () => {},
    };
    instance.toRsbuildPlugin().setup!(api as never);
  });
});
