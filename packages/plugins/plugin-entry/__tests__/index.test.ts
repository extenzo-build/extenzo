import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { entryPlugin } from "../src/index.ts";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo } from "@extenzo/core";

function createMockConfig(root: string): ExtenzoResolvedConfig {
  return {
    root,
    srcDir: "src",
    outDir: "dist",
    outputRoot: ".",
    manifest: {},
  } as unknown as ExtenzoResolvedConfig;
}

function createMockEntries(root: string): EntryInfo[] {
  return [
    { name: "background", scriptPath: resolve(root, "src/background/index.ts"), htmlPath: undefined },
    { name: "popup", scriptPath: resolve(root, "src/popup/index.ts"), htmlPath: resolve(root, "src/popup/index.html") },
  ];
}

describe("plugin-entry", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `extenzo-entry-plugin-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("returns plugin with name extenzo-entry", () => {
    const config = createMockConfig("/app");
    const entries = createMockEntries("/app");
    const plugin = entryPlugin(config, entries);
    expect(plugin.name).toBe("extenzo-entry");
    expect(plugin.setup).toBeDefined();
    expect(typeof plugin.setup).toBe("function");
  });

  it("setup modifyRsbuildConfig merges entry and html config", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    expect(modifyCb).not.toBeNull();

    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);

    expect(rsbuildConfig.source).toBeDefined();
    expect((rsbuildConfig.source as Record<string, unknown>).entry).toBeDefined();
    const entry = (rsbuildConfig.source as Record<string, unknown>).entry as Record<string, unknown>;
    expect(entry.background).toEqual({ import: resolve(testRoot, "src/background/index.ts"), html: false });
    expect(entry.popup).toBe(resolve(testRoot, "src/popup/index.ts"));

    expect(rsbuildConfig.html).toBeDefined();
    expect(typeof (rsbuildConfig.html as Record<string, unknown>).template).toBe("function");

    expect(rsbuildConfig.output).toBeDefined();
    expect((rsbuildConfig.output as Record<string, unknown>).distPath).toBeDefined();
  });

  it("setup html.template returns templatePath from templateMap", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);

    const templateFn = (rsbuildConfig.html as Record<string, unknown>).template as (opts: { entryName: string }) => string | undefined;
    const result = templateFn({ value: "", entryName: "popup" });
    expect(result).toBe(resolve(testRoot, "src/popup/index.html"));
  });

  it("setup onBeforeCreateCompiler sets watchOptions and output", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    expect(bundlerConfig.watchOptions).toBeDefined();
    expect((bundlerConfig.watchOptions as Record<string, unknown>).ignored).toBeDefined();
    expect(bundlerConfig.output).toBeDefined();
    expect((bundlerConfig.output as Record<string, unknown>).path).toBe(resolve(testRoot, "dist"));
    expect((bundlerConfig.output as Record<string, unknown>).filename).toBeDefined();
  });

  it("setup adds public copy when public dir exists", () => {
    const publicDir = resolve(testRoot, "public");
    mkdirSync(publicDir, { recursive: true });
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = { output: {} };
    modifyCb!(rsbuildConfig);

    const copy = (rsbuildConfig.output as Record<string, unknown>).copy as unknown[];
    expect(Array.isArray(copy)).toBe(true);
    expect(copy.some((c: { from?: string }) => c.from === publicDir)).toBe(true);
  });

  it("setup html.template calls prevTemplate when entryName not in templateMap", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const prevTemplateReturn = "/custom.html";
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {
      html: { template: (opts: { entryName: string }) => (opts.entryName === "custom" ? prevTemplateReturn : undefined) },
    };
    modifyCb!(rsbuildConfig);

    const templateFn = (rsbuildConfig.html as Record<string, unknown>).template as (opts: { entryName: string; value: string }) => string | undefined;
    const result = templateFn({ value: "", entryName: "custom" });
    expect(result).toBe(prevTemplateReturn);
  });

  it("setup tools.htmlPlugin calls prevHtmlPlugin when provided", () => {
    const popupDir = resolve(testRoot, "src", "popup");
    mkdirSync(popupDir, { recursive: true });
    const templatePath = resolve(popupDir, "index.html");
    writeFileSync(templatePath, "<html></html>", "utf-8");
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: resolve(popupDir, "index.ts"), htmlPath: templatePath },
    ];
    const plugin = entryPlugin(config, entries);

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    let prevHtmlPluginCalled = false;
    const rsbuildConfig: Record<string, unknown> = {
      tools: {
        htmlPlugin: (_htmlConfig: unknown, _ctx: unknown) => {
          prevHtmlPluginCalled = true;
        },
      },
    };
    modifyCb!(rsbuildConfig);

    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = { template: templatePath };
    htmlPluginFn(htmlConfig, { entryName: "popup" });
    expect(prevHtmlPluginCalled).toBe(true);
  });

  it("setup onBeforeCreateCompiler with existing output and optimization", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [{ name: "HotModuleReplacementPlugin" }],
      devServer: { hot: true },
      watchOptions: { ignored: "foo" },
      output: { path: "", filename: "" },
      optimization: { splitChunks: { chunks: () => true } },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    expect(bundlerConfig.devServer.hot).toBe(false);
    expect(Array.isArray(bundlerConfig.plugins)).toBe(true);
    expect((bundlerConfig.plugins as unknown[]).length).toBe(0);
    expect((bundlerConfig.output as Record<string, unknown>).filename).toBeDefined();
    expect((bundlerConfig.optimization.splitChunks as Record<string, unknown>).chunks).toBeDefined();
  });

  it("setup onBeforeCreateCompiler removes HMR plugin by constructor.name", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const hmrByConstructor = { constructor: { name: "HotModuleReplacementPlugin" } };
    const bundlerConfig = {
      plugins: [hmrByConstructor],
      devServer: {},
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig.plugins as unknown[]).length).toBe(0);
  });

  it("setup tools.htmlPlugin sets filename and stripScripts when template in entries", () => {
    const popupDir = resolve(testRoot, "src", "popup");
    mkdirSync(popupDir, { recursive: true });
    const templatePath = resolve(popupDir, "index.html");
    writeFileSync(
      templatePath,
      '<html><script src="local.js"></script><script src="https://cdn.example.com/x.js"></script></html>',
      "utf-8"
    );
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: resolve(popupDir, "index.ts"), htmlPath: templatePath },
    ];
    const plugin = entryPlugin(config, entries);

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);

    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>)?.htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    expect(typeof htmlPluginFn).toBe("function");

    const htmlConfig: Record<string, unknown> = { template: templatePath };
    htmlPluginFn(htmlConfig, { entryName: "popup" });

    expect(htmlConfig.filename).toBe("popup/index.html");
    expect(htmlConfig.templateContent).toBeDefined();
    expect(String(htmlConfig.templateContent)).not.toContain("local.js");
    expect(String(htmlConfig.templateContent)).toContain("https://cdn.example.com");
  });

  it("setup html.template returns undefined when entryName not in templateMap and no prevTemplate", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = { html: {} };
    modifyCb!(rsbuildConfig);
    const templateFn = (rsbuildConfig.html as Record<string, unknown>).template as (opts: { entryName: string }) => string | undefined;
    const result = templateFn({ value: "", entryName: "unknown" });
    expect(result).toBeUndefined();
  });

  it("setup tools.htmlPlugin when no prevHtmlPlugin still sets filename for known entry", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = { tools: {} };
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = {};
    htmlPluginFn(htmlConfig, { entryName: "popup" });
    expect(htmlConfig.filename).toBe("popup/index.html");
  });

  it("setup tools.htmlPlugin when template path does not exist does not set templateContent", () => {
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: resolve(testRoot, "src/popup/index.ts"), htmlPath: resolve(testRoot, "src/popup/missing.html") },
    ];
    const plugin = entryPlugin(config, entries);
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = { template: resolve(testRoot, "src/popup/missing.html") };
    htmlPluginFn(htmlConfig, { entryName: "popup" });
    expect(htmlConfig.templateContent).toBeUndefined();
  });

  it("setup modifyRsbuildConfig merges with existing output.distPath object", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {
      output: { distPath: { root: "/old", html: "/old-html" } },
    };
    modifyCb!(rsbuildConfig);
    const distPath = (rsbuildConfig.output as Record<string, unknown>).distPath as Record<string, unknown>;
    expect(distPath.root).toBe("./dist");
    expect(distPath.html).toBe("/old-html");
  });

  it("setup modifyRsbuildConfig appends to existing output.copy array", () => {
    const publicDir = resolve(testRoot, "public");
    mkdirSync(publicDir, { recursive: true });
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const existingCopy = { from: "/existing" };
    const rsbuildConfig: Record<string, unknown> = { output: { copy: [existingCopy] } };
    modifyCb!(rsbuildConfig);
    const copy = (rsbuildConfig.output as Record<string, unknown>).copy as unknown[];
    expect(Array.isArray(copy)).toBe(true);
    expect(copy).toHaveLength(2);
    expect((copy[0] as { from: string }).from).toBe("/existing");
    expect((copy[1] as { from: string }).from).toBe(publicDir);
  });

  it("setup onBeforeCreateCompiler returns early when bundlerConfigs[0] is missing", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    await onBeforeCb!({ bundlerConfigs: [] });
    expect(true).toBe(true);
  });

  it("setup onBeforeCreateCompiler with watchOptions.ignored as single value", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: { ignored: "foo" as unknown },
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const ignored = (bundlerConfig.watchOptions as Record<string, unknown>).ignored;
    expect(Array.isArray(ignored)).toBe(true);
    expect((ignored as unknown[]).length).toBe(2);
  });

  it("setup onBeforeCreateCompiler disableRspackHmr when devServer is undefined", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig as Record<string, unknown>).devServer).toEqual({ hot: false });
  });

  it("setup onBeforeCreateCompiler splitChunks.chunks as default when not function", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: { path: "", filename: "" },
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const chunksFn = (bundlerConfig.optimization.splitChunks as Record<string, unknown>).chunks;
    expect(typeof chunksFn).toBe("function");
    const fn = chunksFn as (chunk: { name?: string }) => boolean;
    expect(fn({ name: "background" })).toBe(false);
    expect(fn({ name: "popup" })).toBe(true);
    expect(fn({})).toBe(true);
  });

  it("setup onBeforeCreateCompiler output.filename/cssFilename use chunk.id when chunk.name missing", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries);
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const filenameFn = (bundlerConfig.output as Record<string, unknown>).filename as (pathData: { chunk?: { name?: string; id?: string } }) => string;
    const cssFilenameFn = (bundlerConfig.output as Record<string, unknown>).cssFilename as (pathData: { chunk?: { name?: string; id?: string } }) => string;
    expect(filenameFn({ chunk: { id: "vendor" } })).toBe("static/js/vendor.js");
    expect(filenameFn({ chunk: {} })).toBe("static/js/chunk.js");
    expect(cssFilenameFn({ chunk: { id: "styles" } })).toBe("static/css/styles.css");
    expect(cssFilenameFn({ chunk: { name: "popup" } })).toBe("popup/index.css");
  });

  it("buildFilenameMap for custom entry with htmlPath", () => {
    const customDir = resolve(testRoot, "src", "custom");
    mkdirSync(customDir, { recursive: true });
    const htmlPath = resolve(customDir, "page.html");
    writeFileSync(htmlPath, "<html></html>", "utf-8");
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      ...createMockEntries(testRoot),
      { name: "custom", scriptPath: resolve(customDir, "index.ts"), htmlPath },
    ];
    const plugin = entryPlugin(config, entries);
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = {};
    htmlPluginFn(htmlConfig, { entryName: "custom" });
    expect(htmlConfig.filename).toBe("custom/page.html");
  });
});
