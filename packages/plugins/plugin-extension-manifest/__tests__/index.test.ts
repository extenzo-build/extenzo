import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { extensionPlugin } from "../src/index.ts";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo } from "@extenzo/core";

function createMockConfig(root: string): ExtenzoResolvedConfig {
  return {
    root,
    outDir: "dist",
    outputRoot: ".",
    manifest: { name: "Test", version: "1.0.0", manifest_version: 3 },
  } as unknown as ExtenzoResolvedConfig;
}

function createMockEntries(): EntryInfo[] {
  return [
    { name: "background", scriptPath: "/app/src/background/index.ts", htmlPath: undefined },
  ];
}

describe("plugin-extension", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `extenzo-ext-plugin-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("returns plugin with name extenzo-extension", () => {
    const config = createMockConfig("/app");
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium");
    expect(plugin.name).toBe("extenzo-extension");
    expect(plugin.setup).toBeDefined();
    expect(typeof plugin.setup).toBe("function");
  });

  it("setup registers onBeforeCreateCompiler and write manifest on afterEmit", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "Written", version: "1.0.0", manifest_version: 3 };
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium");

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    expect(onBeforeCb).not.toBeNull();

    const bundlerConfig = {} as Record<string, unknown>;
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    expect(Array.isArray(bundlerConfig.plugins)).toBe(true);
    expect((bundlerConfig.plugins as unknown[]).length).toBe(1);
    const postBuildPlugin = (bundlerConfig.plugins as unknown[])[0] as { name: string; apply: (compiler: unknown) => void };
    expect(postBuildPlugin.name).toBe("extenzo-extension-post-build");

    let afterEmitFn: (() => void) | null = null;
    const compiler = {
      hooks: {
        afterEmit: {
          tap: (_name: string, fn: () => void) => {
            afterEmitFn = fn;
          },
        },
      },
    };

    postBuildPlugin.apply(compiler);
    expect(afterEmitFn).not.toBeNull();
    afterEmitFn!();

    const manifestPath = resolve(distPath, "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBe("Written");
  });

  it("setup returns early when bundlerConfigs[0] is missing", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium");

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    await onBeforeCb!({ bundlerConfigs: [] });
    expect(true).toBe(true);
  });

  it("writes firefox manifest when browser is firefox", async () => {
    const config = createMockConfig(testRoot);
    config.manifest = {
      chromium: { name: "C" },
      firefox: { name: "F", version: "1.0.0", manifest_version: 3 },
    } as never;
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "firefox");

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    afterEmitFn!();

    const manifestPath = resolve(testRoot, "dist", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBe("F");
  });

  it("when distPath already exists does not fail and still writes manifest", async () => {
    const distPath = resolve(testRoot, "dist");
    mkdirSync(distPath, { recursive: true });
    const config = createMockConfig(testRoot);
    config.manifest = { name: "Exists", version: "1.0.0", manifest_version: 3 };
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium");

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    afterEmitFn!();

    expect(existsSync(resolve(distPath, "manifest.json"))).toBe(true);
    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.name).toBe("Exists");
  });

  it("pushes post-build plugin when config.plugins already has items", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium");
    const existingPlugin = { name: "existing" };
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [existingPlugin] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    expect(bundlerConfig.plugins).toHaveLength(2);
    expect((bundlerConfig.plugins[0] as { name: string }).name).toBe("existing");
    expect((bundlerConfig.plugins[1] as { name: string }).name).toBe("extenzo-extension-post-build");
  });

  it("throws when required HTML entry has html:false (popup)", async () => {
    const config = createMockConfig(testRoot);
    config.manifest = { name: "X", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [
      { name: "background", scriptPath: "/app/background/index.ts", htmlPath: undefined },
      { name: "popup", scriptPath: "/app/popup/index.ts", htmlPath: undefined, html: false } as EntryInfo,
    ];
    const plugin = extensionPlugin(config, entries, "chromium");
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    expect(afterEmitFn).not.toBeNull();
    expect(() => afterEmitFn!()).toThrow(/must generate HTML/);
  });

  it("throws when MV3 background has html:true", async () => {
    const config = createMockConfig(testRoot);
    config.manifest = { name: "X", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [
      { name: "background", scriptPath: "/app/background/index.ts", htmlPath: undefined, html: true } as EntryInfo,
    ];
    const plugin = extensionPlugin(config, entries, "chromium");
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    expect(() => afterEmitFn!()).toThrow(/background.*cannot generate HTML/);
  });

  it("calls onWarn when browser is firefox but manifest only has chromium", async () => {
    const config = createMockConfig(testRoot);
    config.manifest = {
      chromium: { name: "C", version: "1.0.0", manifest_version: 3 },
    } as never;
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "firefox");

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: string) => { warnings.push(msg); };
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    afterEmitFn!();
    console.warn = origWarn;

    expect(warnings.length).toBeGreaterThan(0);
    const manifestPath = resolve(testRoot, "dist", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBe("C");
  });
});
