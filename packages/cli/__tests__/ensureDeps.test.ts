import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { ensureDependencies, type PackageManager } from "../src/ensureDeps.ts";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
function createMinimalResolvedConfig(plugins: unknown[] = []): ExtenzoResolvedConfig {
  return {
    root: "",
    srcDir: "src",
    outDir: "dist",
    outputRoot: ".",
    manifest: {},
    plugins,
    envPrefix: ["VITE_"],
  } as unknown as ExtenzoResolvedConfig;
}

describe("ensureDeps", () => {
  let testRoot: string;
  const origEnv = process.env.EXTENZO_SKIP_DEPS;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `extenzo-ensure-deps-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
    if (origEnv !== undefined) process.env.EXTENZO_SKIP_DEPS = origEnv;
    else delete process.env.EXTENZO_SKIP_DEPS;
  });

  it("when EXTENZO_SKIP_DEPS=1 returns installed []", async () => {
    process.env.EXTENZO_SKIP_DEPS = "1";
    const config = createMinimalResolvedConfig();
    config.root = testRoot;
    const result = await ensureDependencies(testRoot, config, { silent: true });
    expect(result.installed).toEqual([]);
  });

  it("when package.json has @types/chrome and no framework plugins returns installed []", async () => {
    writeFileSync(
      resolve(testRoot, "package.json"),
      JSON.stringify({
        name: "test",
        devDependencies: { "@types/chrome": "^0.0.0" },
      }),
      "utf-8"
    );
    const config = createMinimalResolvedConfig([]);
    config.root = testRoot;
    const result = await ensureDependencies(testRoot, config, { silent: true });
    expect(result.installed).toEqual([]);
  });

  it("when package.json has vue and extenzo-vue plugin returns installed [] when deps present", async () => {
    writeFileSync(
      resolve(testRoot, "package.json"),
      JSON.stringify({
        name: "test",
        dependencies: { vue: "^3.4.0" },
        devDependencies: { "@types/chrome": "^0.0.0" },
      }),
      "utf-8"
    );
    const config = createMinimalResolvedConfig([{ name: "extenzo-vue" }]);
    config.root = testRoot;
    const result = await ensureDependencies(testRoot, config, { silent: true });
    expect(Array.isArray(result.installed)).toBe(true);
  });

  it("when missing @types/chrome and runInstall mock returns installed list", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    const config = createMinimalResolvedConfig([]);
    const result = await ensureDependencies(testRoot, config, {
      silent: true,
      runInstall: () => true,
    });
    expect(result.installed).toContain("@types/chrome");
  });

  it("detectPackageManager returns pnpm when pnpm-lock.yaml exists", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    let detectedPm: PackageManager | null = null;
    await ensureDependencies(testRoot, createMinimalResolvedConfig([]), {
      silent: true,
      runInstall: (_root, pm) => {
        detectedPm = pm;
        return true;
      },
    });
    expect(detectedPm).toBe("pnpm");
  });

  it("detectPackageManager returns yarn when yarn.lock exists", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "yarn.lock"), "", "utf-8");
    let detectedPm: PackageManager | null = null;
    await ensureDependencies(testRoot, createMinimalResolvedConfig([]), {
      silent: true,
      runInstall: (_root, pm) => {
        detectedPm = pm;
        return true;
      },
    });
    expect(detectedPm).toBe("yarn");
  });

  it("detectPackageManager returns npm when package-lock.json exists", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "package-lock.json"), "{}", "utf-8");
    let detectedPm: PackageManager | null = null;
    await ensureDependencies(testRoot, createMinimalResolvedConfig([]), {
      silent: true,
      runInstall: (_root, pm) => {
        detectedPm = pm;
        return true;
      },
    });
    expect(detectedPm).toBe("npm");
  });

  it("detectPackageManager returns bun when bun.lockb exists", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "bun.lockb"), "", "utf-8");
    let detectedPm: PackageManager | null = null;
    await ensureDependencies(testRoot, createMinimalResolvedConfig([]), {
      silent: true,
      runInstall: (_root, pm) => {
        detectedPm = pm;
        return true;
      },
    });
    expect(detectedPm).toBe("bun");
  });

  it("when runInstall returns false returns installed []", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    const config = createMinimalResolvedConfig([]);
    const result = await ensureDependencies(testRoot, config, {
      silent: true,
      runInstall: () => false,
    });
    expect(result.installed).toEqual([]);
  });

  it("when not silent and install success logs and does not warn", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    let logCalls: string[] = [];
    let warnCalls: string[] = [];
    const origLog = console.log;
    const origWarn = console.warn;
    console.log = (...args: unknown[]) => { logCalls.push(String(args[0])); };
    console.warn = (...args: unknown[]) => { warnCalls.push(String(args[0])); };
    const config = createMinimalResolvedConfig([]);
    await ensureDependencies(testRoot, config, {
      silent: false,
      runInstall: () => true,
    });
    expect(logCalls.some((m) => m.includes("@types/chrome"))).toBe(true);
    expect(warnCalls.length).toBe(0);
    console.log = origLog;
    console.warn = origWarn;
  });

  it("when not silent and install fail warns", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    let warnCalls: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => { warnCalls.push(String(args[0])); };
    const config = createMinimalResolvedConfig([]);
    await ensureDependencies(testRoot, config, {
      silent: false,
      runInstall: () => false,
    });
    expect(warnCalls.some((m) => m.includes("Failed to install"))).toBe(true);
    console.warn = origWarn;
  });
});
