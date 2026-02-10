import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { Pipeline, runPipeline, devWriteToDiskFilter } from "../src/pipeline.ts";
import type { ConfigLoader } from "@extenzo/core";
import type { CliParser } from "@extenzo/core";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo } from "@extenzo/core";

function createMockConfig(root: string, overrides: Partial<ExtenzoResolvedConfig> = {}): ExtenzoResolvedConfig {
  return {
    root,
    appDir: "src",
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
        target: undefined,
        launch: argv.includes("firefox") ? "firefox" : undefined,
        unknownLaunch: undefined,
        unknownTarget: undefined,
        persist: false,
      }),
    } as unknown as CliParser;

    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build", "-l", "firefox"]);

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
      parse: () => ({ command: "dev", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;

    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["dev"]);

    expect(ctx.isDev).toBe(true);
  });

  it("run with rsbuildConfig as function merges via helpers", async () => {
    const mockResolved = createMockConfig(testRoot);
    (mockResolved as unknown as Record<string, unknown>).rsbuildConfig = (
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
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;

    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.rsbuildConfig).toBeDefined();
  });

  it("run with rsbuildConfig as object merges with base", async () => {
    const mockResolved = createMockConfig(testRoot);
    (mockResolved as unknown as Record<string, unknown>).rsbuildConfig = { output: { assetPrefix: "/assets/" } };
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.rsbuildConfig.output).toBeDefined();
    expect((ctx.rsbuildConfig.output as Record<string, unknown>).assetPrefix).toBe("/assets/");
  });

  it("run with -t firefox sets ctx.browser to firefox", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: "firefox", launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build", "-t", "firefox"]);
    expect(ctx.browser).toBe("firefox");
  });

  it("run with unknownLaunch warns and returns ctx with default browser", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: "safari", unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    let warned = false;
    const { setExoLoggerRawWrites } = await import("@extenzo/core");
    setExoLoggerRawWrites({
      stdout: process.stdout.write.bind(process.stdout),
      stderr: (_chunk: unknown, _enc?: unknown, cb?: () => void) => {
        warned = true;
        if (typeof cb === "function") cb();
        return true;
      },
    });
    try {
      const pipeline = new Pipeline(configLoader, cliParser);
      const ctx = await pipeline.run(testRoot, ["build"]);
      expect(ctx.browser).toBe("chromium");
      expect(warned).toBe(true);
    } finally {
      setExoLoggerRawWrites(null);
    }
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
      plugins: [{ name: "extenzo-vue" }] as unknown as never,
    });
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
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
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
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
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
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
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
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
      parse: () => ({ command: "dev", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["dev"]);
    expect(ctx.rsbuildConfig.dev).toBeDefined();
    expect((ctx.rsbuildConfig.dev as Record<string, unknown>).hmr).toBe(false);
    expect(ctx.rsbuildConfig.tools).toBeDefined();
    expect(typeof (ctx.rsbuildConfig.tools as Record<string, unknown>).rspack).toBe("function");
  });

  it("run with config.browser firefox and no -t sets ctx.browser to firefox", async () => {
    const mockResolved = createMockConfig(testRoot, { browser: "firefox" as never });
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.browser).toBe("firefox");
  });

  it("run with config.browser chromium sets launchTarget to chrome", async () => {
    const mockResolved = createMockConfig(testRoot, { browser: "chromium" as never });
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.launchTarget).toBe("chrome");
    expect(ctx.browser).toBe("chromium");
  });

  it("run with config.entry false omits entry plugin", async () => {
    const mockResolved = createMockConfig(testRoot);
    (mockResolved as unknown as Record<string, unknown>).entry = false;
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    const names = (ctx.rsbuildConfig.plugins as { name?: string }[]).map((p) => p.name);
    expect(names).not.toContain("extenzo-entry");
  });

  it("run with config.debug true in dev adds monitor plugin", async () => {
    const mockResolved = createMockConfig(testRoot, { debug: true as never });
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "dev", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false, debug: undefined }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["dev"]);
    const names = (ctx.rsbuildConfig.plugins as { name?: string }[]).map((p) => p.name);
    expect(names).toContain("extenzo-monitor");
  });

  it("run with --debug in dev adds monitor plugin even when config has no debug", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "dev", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false, debug: true }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["dev", "--debug"]);
    const names = (ctx.rsbuildConfig.plugins as { name?: string }[]).map((p) => p.name);
    expect(names).toContain("extenzo-monitor");
  });

  it("run with config.browser non-string ignores and uses default", async () => {
    const mockResolved = createMockConfig(testRoot);
    (mockResolved as unknown as Record<string, unknown>).browser = { name: "chrome" };
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.browser).toBe("chromium");
  });

  it("run with config.browser invalid warns and defaults browser", async () => {
    const mockResolved = createMockConfig(testRoot, { browser: "safari" as never });
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    let warned = false;
    const { setExoLoggerRawWrites } = await import("@extenzo/core");
    setExoLoggerRawWrites({
      stdout: process.stdout.write.bind(process.stdout),
      stderr: (_chunk: unknown, _enc?: unknown, cb?: () => void) => {
        warned = true;
        if (typeof cb === "function") cb();
        return true;
      },
    });
    try {
      const pipeline = new Pipeline(configLoader, cliParser);
      const ctx = await pipeline.run(testRoot, ["build"]);
      expect(warned).toBe(true);
      expect(ctx.browser).toBe("chromium");
    } finally {
      setExoLoggerRawWrites(null);
    }
  });

  it("run with config.browser non-string uses default browser", async () => {
    const mockResolved = createMockConfig(testRoot);
    (mockResolved as Record<string, unknown>).browser = { name: "chrome" };
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.browser).toBe("chromium");
  });

  it("run with config.persist true sets ctx.persist true", async () => {
    const mockResolved = createMockConfig(testRoot, { persist: true as never });
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["build"]);
    expect(ctx.persist).toBe(true);
  });

  it("run with unknownTarget warns", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "build", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: "safari", persist: false }),
    } as unknown as CliParser;
    let warned = false;
    const { setExoLoggerRawWrites } = await import("@extenzo/core");
    setExoLoggerRawWrites({
      stdout: process.stdout.write.bind(process.stdout),
      stderr: (_chunk: unknown, _enc?: unknown, cb?: () => void) => {
        warned = true;
        if (typeof cb === "function") cb();
        return true;
      },
    });
    try {
      const pipeline = new Pipeline(configLoader, cliParser);
      await pipeline.run(testRoot, ["build"]);
      expect(warned).toBe(true);
    } finally {
      setExoLoggerRawWrites(null);
    }
  });

  it("devWriteToDiskFilter returns false for hot-update filenames", () => {
    expect(devWriteToDiskFilter("main.hot-update.js")).toBe(false);
    expect(devWriteToDiskFilter("static/js/main.js")).toBe(true);
  });

  it("runPipeline delegates to default pipeline and returns context", async () => {
    writeFileSync(
      resolve(testRoot, "exo.config.js"),
      "export default { manifest: { name: \"T\", version: \"1\", manifest_version: 3 }, appDir: \"src\" };",
      "utf-8"
    );
    mkdirSync(resolve(testRoot, "src", "background"), { recursive: true });
    writeFileSync(resolve(testRoot, "src/background/index.js"), "// entry", "utf-8");
    const ctx = await runPipeline(testRoot, ["build"]);
    expect(ctx).toBeDefined();
    expect(ctx.root).toBe(testRoot);
    expect(ctx.command).toBe("build");
    expect(ctx.rsbuildConfig).toBeDefined();
  });

  it("run with dev invokes tools.rspack and appendPlugins is called", async () => {
    const mockResolved = createMockConfig(testRoot);
    const mockEntries = createMockEntries(testRoot);
    const configLoader = {
      resolve: () => ({ config: mockResolved, baseEntries: mockEntries, entries: mockEntries }),
    } as unknown as ConfigLoader;
    const cliParser = {
      parse: () => ({ command: "dev", target: undefined, launch: undefined, unknownLaunch: undefined, unknownTarget: undefined, persist: false }),
    } as unknown as CliParser;
    const pipeline = new Pipeline(configLoader, cliParser);
    const ctx = await pipeline.run(testRoot, ["dev"]);
    const rspackFn = (ctx.rsbuildConfig.tools as Record<string, unknown>)?.rspack as (config: unknown, utils: { appendPlugins?: (p: unknown) => void }) => unknown;
    expect(typeof rspackFn).toBe("function");
    let appended = false;
    rspackFn({}, { appendPlugins: (p: unknown) => { appended = true; expect(p).toBeDefined(); } });
    expect(appended).toBe(true);
  });
});
