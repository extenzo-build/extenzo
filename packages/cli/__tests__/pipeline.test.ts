import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { Pipeline } from "../src/pipeline.ts";
import type { ConfigLoader } from "@extenzo/core";
import type { CliParser } from "@extenzo/core";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo } from "@extenzo/core";

function createMockConfig(root: string, overrides: Partial<ExtenzoResolvedConfig> = {}): ExtenzoResolvedConfig {
  return {
    root,
    srcDir: "src",
    outDir: "dist",
    outputRoot: ".",
    manifest: {},
    plugins: [],
    envPrefix: [],
    ...overrides,
  } as unknown as ExtenzoResolvedConfig;
}

function createMockEntries(root: string): EntryInfo[] {
  return [
    { name: "background", scriptPath: resolve(root, "src/background/index.ts"), htmlPath: undefined },
    { name: "popup", scriptPath: resolve(root, "src/popup/index.ts"), htmlPath: resolve(root, "src/popup/index.html") },
  ];
}

describe("Pipeline", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `extenzo-pipeline-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
    writeFileSync(
      resolve(testRoot, "package.json"),
      JSON.stringify({ name: "test", devDependencies: { "@types/chrome": "^0.0.0" } }),
      "utf-8"
    );
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("run returns context with command and browser from argv", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: (argv: string[]) => ({
        command: argv.includes("build") ? "build" : "dev",
        browser: argv.includes("firefox") ? "firefox" : "chromium",
        unknownBrowser: undefined,
      }),
    } as unknown as CliParser;

    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build", "firefox"]);

    expect(ctx.command).toBe("build");
    expect(ctx.browser).toBe("firefox");
    expect(ctx.root).toBe(testRoot);
    expect(ctx.config).toBe(mockResolved);
    expect(ctx.entries).toEqual(mockEntries);
    expect(ctx.isDev).toBe(false);
    expect(ctx.rsbuildConfig).toBeDefined();
    expect(ctx.rsbuildConfig.plugins).toBeDefined();
    expect(Array.isArray(ctx.rsbuildConfig.plugins)).toBe(true);
  });

  it("run with dev argv sets isDev true", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "dev", browser: "chromium", unknownBrowser: undefined }),
    } as unknown as CliParser;

    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["dev"]);

    expect(ctx.isDev).toBe(true);
  });

  it("run with rsbuildConfig as function merges via helpers", async () => {
    const mockResolved = createMockConfig(testRoot);
    (mockResolved as Record<string, unknown>).rsbuildConfig = (
      base: { root?: string },
      helpers?: { merge: (a: unknown, b: unknown) => unknown }
    ) => {
      if (helpers?.merge) return helpers.merge(base, { output: { legalComments: "none" } }) as typeof base;
      return { ...base };
    };
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", browser: "chromium", unknownBrowser: undefined }),
    } as unknown as CliParser;

    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.rsbuildConfig).toBeDefined();
  });

  it("run with rsbuildConfig as object merges with base", async () => {
    const mockResolved = createMockConfig(testRoot);
    (mockResolved as Record<string, unknown>).rsbuildConfig = { output: { assetPrefix: "/assets/" } };
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", browser: "chromium", unknownBrowser: undefined }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.rsbuildConfig.output).toBeDefined();
    expect((ctx.rsbuildConfig.output as Record<string, unknown>).assetPrefix).toBe("/assets/");
  });

  it("run with unknownBrowser warns and returns ctx with default browser", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", browser: "chromium", unknownBrowser: "safari" }),
    } as unknown as CliParser;
    const warn = console.warn;
    let warned = false;
    console.warn = () => {
      warned = true;
    };
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    console.warn = warn;
    expect(ctx.browser).toBe("chromium");
    expect(warned).toBe(true);
  });

  it("run with config.plugins as extenzo-vue expands framework plugins", async () => {
    writeFileSync(
      resolve(testRoot, "package.json"),
      JSON.stringify({
        name: "test",
        devDependencies: { "@types/chrome": "^0.0.246", vue: "^3.4.0" },
      }),
      "utf-8"
    );
    const mockResolved = createMockConfig(testRoot, {
      plugins: [{ name: "extenzo-vue" }],
    });
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", browser: "chromium", unknownBrowser: undefined }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.rsbuildConfig.plugins).toBeDefined();
    const names = (ctx.rsbuildConfig.plugins as { name?: string }[]).map((p) => p.name);
    expect(names).toContain("extenzo-entry");
    expect(names).toContain("extenzo-extension");
  });

  it("run with config.plugins as single plugin (non-array) merges correctly", async () => {
    const singlePlugin = { name: "user-plugin" };
    const mockResolved = createMockConfig(testRoot, {
      plugins: singlePlugin as never,
    });
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", browser: "chromium", unknownBrowser: undefined }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    const names = (ctx.rsbuildConfig.plugins as { name?: string }[]).map((p) => p.name);
    expect(names).toContain("user-plugin");
  });

  it("run with no rsbuildConfig returns merged base config", async () => {
    const mockResolved = createMockConfig(testRoot);
    expect(mockResolved.rsbuildConfig).toBeUndefined();
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", browser: "chromium", unknownBrowser: undefined }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.rsbuildConfig.root).toBe(testRoot);
    expect(ctx.rsbuildConfig.output).toBeDefined();
  });

  it("run calls config hooks when provided", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const hookCalls: string[] = [];
    mockResolved.hooks = {
      afterCliParsed: async () => { hookCalls.push("afterCliParsed"); },
      afterConfigLoaded: async () => { hookCalls.push("afterConfigLoaded"); },
      beforeRsbuildConfig: async () => { hookCalls.push("beforeRsbuildConfig"); },
      beforeBuild: async () => { hookCalls.push("beforeBuild"); },
    };
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", browser: "chromium", unknownBrowser: undefined }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    await pipeline.run(testRoot, ["build"]);
    expect(hookCalls).toContain("afterCliParsed");
    expect(hookCalls).toContain("afterConfigLoaded");
    expect(hookCalls).toContain("beforeRsbuildConfig");
    expect(hookCalls).toContain("beforeBuild");
  });

  it("run with dev returns HMR overrides in rsbuildConfig", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "dev", browser: "chromium", unknownBrowser: undefined }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["dev"]);
    expect(ctx.rsbuildConfig.dev).toBeDefined();
    expect((ctx.rsbuildConfig.dev as Record<string, unknown>).hmr).toBe(false);
    expect(ctx.rsbuildConfig.tools).toBeDefined();
    expect(typeof (ctx.rsbuildConfig.tools as Record<string, unknown>).rspack).toBe("function");
  });
});
