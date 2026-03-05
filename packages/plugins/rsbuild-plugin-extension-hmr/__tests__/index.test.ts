import { describe, expect, it } from "@rstest/core";
import { resolve } from "path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import {
  hmrPlugin,
  notifyReload,
  getBrowserPath,
  getLaunchPathFromOptions,
  buildDefaultPaths,
  isChromiumBrowser,
  getCacheTempRoot,
  getChromiumUserDataDir,
  getReloadManagerPath,
  findExistingReloadManager,
  statsHasErrors,
  launchBrowserOnly,
  ensureDistReady,
  getReloadKind,
  isContentChanged,
  createTestWsServer,
} from "../src/index.ts";

describe("plugin-extension-hmr", () => {
  it("hmrPlugin returns rsbuild plugin with name rsbuild-plugin-extension-hmr", () => {
    const plugin = hmrPlugin({
      distPath: "/tmp/dist",
      wsPort: 23333,
    });
    expect(plugin.name).toBe("rsbuild-plugin-extension-hmr");
    expect(plugin.setup).toBeDefined();
    expect(typeof plugin.setup).toBe("function");
  });

  it("notifyReload does not throw when no server", () => {
    expect(() => notifyReload()).not.toThrow();
  });

  it("getLaunchPathFromOptions returns path for each browser", () => {
    const opts = {
      chromePath: "C:\\Chrome\\chrome.exe",
      edgePath: "C:\\Edge\\msedge.exe",
      bravePath: "/usr/bin/brave",
      vivaldiPath: "/usr/bin/vivaldi",
      operaPath: "/usr/bin/opera",
      santaPath: "/usr/bin/santa",
      firefoxPath: "/usr/bin/firefox",
    };
    expect(getLaunchPathFromOptions("chrome", opts)).toBe(opts.chromePath);
    expect(getLaunchPathFromOptions("edge", opts)).toBe(opts.edgePath);
    expect(getLaunchPathFromOptions("brave", opts)).toBe(opts.bravePath);
    expect(getLaunchPathFromOptions("vivaldi", opts)).toBe(opts.vivaldiPath);
    expect(getLaunchPathFromOptions("opera", opts)).toBe(opts.operaPath);
    expect(getLaunchPathFromOptions("santa", opts)).toBe(opts.santaPath);
    expect(getLaunchPathFromOptions("firefox", opts)).toBe(opts.firefoxPath);
  });

  it("getBrowserPath returns user path when set", () => {
    expect(getBrowserPath("chrome", { chromePath: "  /custom/chrome  " })).toBe("/custom/chrome");
    expect(getBrowserPath("firefox", { firefoxPath: "C:\\ff\\firefox.exe" })).toBe("C:\\ff\\firefox.exe");
  });

  it("buildDefaultPaths returns arrays for each browser and platform", () => {
    expect(buildDefaultPaths("chrome", "win32")).toBeDefined();
    expect(Array.isArray(buildDefaultPaths("chrome", "win32"))).toBe(true);
    expect(buildDefaultPaths("edge", "darwin")).toBeDefined();
    expect(buildDefaultPaths("brave", "linux")).toBeDefined();
    expect(buildDefaultPaths("opera", "win32")).toBeDefined();
    expect(buildDefaultPaths("santa", "win32")).toBeDefined();
    expect(buildDefaultPaths("firefox", "linux")).toBeDefined();
  });

  it("buildDefaultPaths vivaldi on win32 with USERPROFILE includes user path", () => {
    const prev = process.env.USERPROFILE;
    process.env.USERPROFILE = "C:\\Users\\Test";
    const paths = buildDefaultPaths("vivaldi", "win32");
    if (prev !== undefined) process.env.USERPROFILE = prev;
    expect(paths).toBeDefined();
    expect(Array.isArray(paths)).toBe(true);
    expect(paths!.some((p) => p.includes("Vivaldi"))).toBe(true);
  });

  it("isChromiumBrowser returns true for chromium browsers", () => {
    expect(isChromiumBrowser("chrome")).toBe(true);
    expect(isChromiumBrowser("edge")).toBe(true);
    expect(isChromiumBrowser("brave")).toBe(true);
    expect(isChromiumBrowser("firefox")).toBe(false);
  });

  it("getCacheTempRoot resolves to cache/temp", () => {
    const out = getCacheTempRoot("/proj/dist");
    expect(out).toBe(resolve("/proj/dist", "..", "cache", "temp"));
  });

  it("getChromiumUserDataDir and getReloadManagerPath use cache root", () => {
    expect(getChromiumUserDataDir("/proj/dist", "chrome")).toContain("chrome-user-data");
    expect(getReloadManagerPath("/proj/dist")).toContain("reload-manager-extension");
  });

  it("findExistingReloadManager returns null when cache missing", () => {
    const root = resolve(tmpdir(), `hmr-find-${Date.now()}`);
    expect(findExistingReloadManager(root)).toBeNull();
  });

  it("findExistingReloadManager returns path when manifest and bg exist", () => {
    const distPath = resolve(tmpdir(), `hmr-reload-${Date.now()}`);
    const cacheRoot = resolve(distPath, "..", "cache", "temp");
    const extPath = resolve(cacheRoot, "reload-manager-extension");
    mkdirSync(extPath, { recursive: true });
    writeFileSync(resolve(extPath, "manifest.json"), "{}", "utf-8");
    writeFileSync(resolve(extPath, "bg.js"), "", "utf-8");
    try {
      expect(findExistingReloadManager(distPath)).toBe(extPath);
    } finally {
      const cacheDir = resolve(distPath, "..", "cache");
      if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("statsHasErrors returns false for null or non-object", () => {
    expect(statsHasErrors(null)).toBe(false);
    expect(statsHasErrors(undefined)).toBe(false);
    expect(statsHasErrors("string")).toBe(false);
  });

  it("statsHasErrors returns true when hasErrors() is true", () => {
    expect(statsHasErrors({ hasErrors: () => true })).toBe(true);
  });

  it("statsHasErrors returns false when hasErrors is missing or false", () => {
    expect(statsHasErrors({})).toBe(false);
    expect(statsHasErrors({ hasErrors: () => false })).toBe(false);
  });

  it("ensureDistReady throws when manifest missing (short timeout)", async () => {
    const emptyDir = resolve(tmpdir(), `hmr-no-manifest-${Date.now()}`);
    mkdirSync(emptyDir, { recursive: true });
    await expect(ensureDistReady(emptyDir, 400)).rejects.toThrow("dist not ready");
  });

  it("hmrPlugin apply launch tap catch when ensureDistReady throws", async () => {
    const distPath = resolve(tmpdir(), `hmr-catch-${Date.now()}`);
    mkdirSync(distPath, { recursive: true });
    const errLogs: string[] = [];
    const { setExoLoggerRawWrites } = await import("@extenzo/core");
    setExoLoggerRawWrites({
      stdout: process.stdout.write.bind(process.stdout),
      stderr: (chunk: unknown) => {
        errLogs.push(String(chunk));
        return true;
      },
    });
    try {
      const plugin = hmrPlugin(
        {
          distPath,
          autoOpen: true,
          browser: "chrome",
          chromePath: "/fake/chrome.exe",
          wsPort: 23401,
          enableReload: false,
        },
        {
          runChromiumRunner: async () => ({ exit: async () => {} }),
          ensureDistReady: () => {
            throw new Error("injected fail");
          },
        }
      );
      const cbs: Array<(stats: unknown) => void> = [];
      plugin.apply!({
        hooks: { done: { tap: (_: string, fn: (s: unknown) => void) => cbs.push(fn) } },
      } as never);
      await cbs[0]!({ hasErrors: () => false });
      expect(errLogs.some((m) => m.includes("Failed to launch browser"))).toBe(true);
    } finally {
      setExoLoggerRawWrites(null);
    }
  });

  it("hmrPlugin apply registers done hooks and reload tap invokes notifyReload", async () => {
    const plugin = hmrPlugin({
      distPath: resolve(tmpdir(), "hmr-apply-test"),
      wsPort: 23999,
      enableReload: true,
    });
    const reloadCbs: Array<(stats: unknown) => void> = [];
    const launchCbs: Array<(stats: unknown) => void> = [];
    const compiler = {
      hooks: {
        done: {
          tap: (name: string, fn: (stats: unknown) => void) => {
            if (name === "extenzo-hmr-reload") reloadCbs.push(fn);
            else launchCbs.push(fn);
          },
        },
      },
    };
    plugin.apply!(compiler as never);
    expect(reloadCbs.length).toBe(1);
    expect(launchCbs.length).toBe(1);
    await reloadCbs[0]!({ hasErrors: () => false });
  });

  it("hmrPlugin apply with autoOpen false does not launch", async () => {
    const plugin = hmrPlugin({
      distPath: resolve(tmpdir(), "hmr-no-open"),
      wsPort: 23998,
      autoOpen: false,
    });
    const cbs: Array<(stats: unknown) => void> = [];
    const compiler = {
      hooks: {
        done: {
          tap: (_name: string, fn: (stats: unknown) => void) => {
            cbs.push(fn);
          },
        },
      },
    };
    plugin.apply!(compiler as never);
    await cbs[1]!({ hasErrors: () => false });
  });

  it("hmrPlugin apply returns early when hooks.done missing", () => {
    const plugin = hmrPlugin({ distPath: "/tmp", wsPort: 23333 });
    const compiler = { hooks: {} };
    expect(() => plugin.apply!(compiler as never)).not.toThrow();
  });

  it("hmrPlugin apply launch tap runs launchBrowser with mock runner", async () => {
    const distPath = resolve(tmpdir(), `hmr-launch-${Date.now()}`);
    mkdirSync(distPath, { recursive: true });
    writeFileSync(
      resolve(distPath, "manifest.json"),
      JSON.stringify({ manifest_version: 3, name: "Test", version: "1.0" }),
      "utf-8"
    );
    const mockRunner = async () => ({ exit: async () => {} });
    const plugin = hmrPlugin(
      {
        distPath,
        autoOpen: true,
        browser: "chrome",
        chromePath: "/fake/chrome.exe",
        wsPort: 23400,
        enableReload: true,
      },
      { runChromiumRunner: mockRunner }
    );
    const cbs: Array<(stats: unknown) => void> = [];
    const compiler = {
      hooks: {
        done: {
          tap: (_name: string, fn: (stats: unknown) => void) => {
            cbs.push(fn);
          },
        },
      },
    };
    plugin.apply!(compiler as never);
    await cbs[1]!({ hasErrors: () => false });
    const cacheDir = resolve(distPath, "..", "cache");
    if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
  });

  it("launchBrowserOnly with mock runner invokes runner (Chromium path)", async () => {
    const distPath = resolve(tmpdir(), `hmr-only-${Date.now()}`);
    mkdirSync(distPath, { recursive: true });
    writeFileSync(
      resolve(distPath, "manifest.json"),
      '{"manifest_version":3,"name":"X"}',
      "utf-8"
    );
    let runnerInvoked = false;
    const mockRunner = async () => {
      runnerInvoked = true;
      return { exit: async () => {} };
    };
    launchBrowserOnly(
      {
        distPath,
        browser: "chrome",
        chromePath: "/fake/chrome.exe",
      },
      mockRunner
    );
    await new Promise((r) => setTimeout(r, 2500));
    expect(runnerInvoked).toBe(true);
    const cacheDir = resolve(distPath, "..", "cache");
    if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
  });

  it("getReloadKind returns toggle-extension for null stats", () => {
    expect(getReloadKind(null)).toBe("toggle-extension");
  });

  it("getReloadKind returns toggle-extension when stats has no compilation", () => {
    expect(getReloadKind("not-an-object")).toBe("toggle-extension");
  });

  it("getReloadKind returns toggle-extension when compilation is not an object", () => {
    expect(getReloadKind({ compilation: "invalid" })).toBe("toggle-extension");
  });

  it("getReloadKind returns toggle-extension when no background entrypoint exists", () => {
    const stats = { compilation: { entrypoints: new Map() } };
    expect(getReloadKind(stats)).toBe("toggle-extension");
  });

  it("getReloadKind returns toggle-extension when entrypoints lacks get method", () => {
    const stats = { compilation: { entrypoints: {} } };
    expect(getReloadKind(stats)).toBe("toggle-extension");
  });

  it("getReloadKind returns reload-extension on first build with background entry", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["background", { chunks: [{ hash: "initial-hash-1" }] }],
        ]),
      },
    };
    expect(getReloadKind(stats)).toBe("reload-extension");
  });

  it("getReloadKind returns toggle-extension when background hash is unchanged", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["background", { chunks: [{ hash: "initial-hash-1" }] }],
        ]),
      },
    };
    expect(getReloadKind(stats)).toBe("toggle-extension");
  });

  it("getReloadKind returns reload-extension when background hash changes", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["background", { chunks: [{ hash: "changed-hash-2" }] }],
        ]),
      },
    };
    expect(getReloadKind(stats)).toBe("reload-extension");
  });

  it("getReloadKind falls back to getFiles when chunks have no hash", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["background", { chunks: [{}], getFiles: () => ["bg.js"] }],
        ]),
      },
    };
    expect(getReloadKind(stats)).toBe("reload-extension");
  });

  it("getReloadKind returns toggle-extension when getFiles throws", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["background", {
            chunks: [{}],
            getFiles: () => { throw new Error("proxy"); },
          }],
        ]),
      },
    };
    expect(getReloadKind(stats)).toBe("toggle-extension");
  });

  it("getReloadKind returns toggle-extension when entrypoint has no chunks or files", () => {
    const stats = {
      compilation: { entrypoints: new Map([["background", {}]]) },
    };
    expect(getReloadKind(stats)).toBe("toggle-extension");
  });

  it("isContentChanged returns false for null stats", () => {
    expect(isContentChanged(null)).toBe(false);
  });

  it("isContentChanged returns false on first build with content entry", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["content", { chunks: [{ hash: "content-v1" }] }],
        ]),
      },
    };
    expect(isContentChanged(stats)).toBe(false);
  });

  it("isContentChanged returns true when content hash changes", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["content", { chunks: [{ hash: "content-v2" }] }],
        ]),
      },
    };
    expect(isContentChanged(stats)).toBe(true);
  });

  it("isContentChanged returns false when content hash is the same", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["content", { chunks: [{ hash: "content-v2" }] }],
        ]),
      },
    };
    expect(isContentChanged(stats)).toBe(false);
  });

  it("createTestWsServer starts and notifyReload does not throw", async () => {
    const port = 29500 + Math.floor(Math.random() * 500);
    const server = await createTestWsServer(port);
    try {
      expect(() => server.notifyReload()).not.toThrow();
    } finally {
      await server.close();
    }
  });

  it("getBrowserPath falls back to system paths when user path is empty string", () => {
    const result = getBrowserPath("chrome", { chromePath: "" });
    expect(result).not.toBe("");
  });

  it("getBrowserPath falls back to system paths when user path is whitespace only", () => {
    const result = getBrowserPath("chrome", { chromePath: "   " });
    expect(result).not.toBe("   ");
  });

  it("buildDefaultPaths vivaldi on win32 without USERPROFILE returns base paths only", () => {
    const prev = process.env.USERPROFILE;
    delete process.env.USERPROFILE;
    try {
      const paths = buildDefaultPaths("vivaldi", "win32");
      expect(paths).toBeDefined();
      expect(Array.isArray(paths)).toBe(true);
      expect(paths!.every((p) => !p.includes("AppData\\Local"))).toBe(true);
    } finally {
      if (prev !== undefined) process.env.USERPROFILE = prev;
    }
  });

  it("getLaunchPathFromOptions returns undefined when no path is configured", () => {
    expect(getLaunchPathFromOptions("chrome", {})).toBeUndefined();
    expect(getLaunchPathFromOptions("firefox", {})).toBeUndefined();
    expect(getLaunchPathFromOptions("edge", {})).toBeUndefined();
  });
});
