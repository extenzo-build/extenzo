import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { zipDist, type ZipDistDeps } from "../src/zipDist.ts";

describe("zipDist", () => {
  let testRoot: string;
  let distPath: string;
  const outDir = "dist";

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `extenzo-zip-${Date.now()}`);
    distPath = resolve(testRoot, outDir);
    mkdirSync(distPath, { recursive: true });
    writeFileSync(resolve(distPath, "manifest.json"), "{}", "utf-8");
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
    const zipPath = resolve(testRoot, `${outDir}.zip`);
    if (existsSync(zipPath)) rmSync(zipPath, { force: true });
  });

  it("resolves with zip path under root", async () => {
    const zipPath = await zipDist(distPath, testRoot, outDir);
    expect(zipPath).toBe(resolve(testRoot, `${outDir}.zip`));
    expect(existsSync(zipPath)).toBe(true);
  });

  it("zip file exists and is non-empty", async () => {
    const zipPath = await zipDist(distPath, testRoot, outDir);
    const stat = await import("fs/promises").then((fs) => fs.stat(zipPath));
    expect(stat.size).toBeGreaterThan(0);
  });

  it("rejects with ExtenzoError when output stream errors (Error instance)", async () => {
    const { PassThrough } = await import("stream");
    const deps: ZipDistDeps = {
      createWriteStream: () => {
        const s = new PassThrough();
        setImmediate(() => s.emit("error", new Error("write failed")));
        return s as never;
      },
    };
    await expect(zipDist(distPath, testRoot, outDir, deps)).rejects.toThrow("Zip output stream failed");
  });

  it("rejects with ExtenzoError when output stream errors (non-Error)", async () => {
    const { PassThrough } = await import("stream");
    const deps: ZipDistDeps = {
      createWriteStream: () => {
        const s = new PassThrough();
        setImmediate(() => s.emit("error", "string error"));
        return s as never;
      },
    };
    await expect(zipDist(distPath, testRoot, outDir, deps)).rejects.toThrow("Zip output stream failed");
  });

  it("rejects with ExtenzoError when archive errors (Error instance)", async () => {
    const deps: ZipDistDeps = {
      archiver: () =>
        ({
          on(ev: string, fn: (err?: Error) => void) {
            if (ev === "error") setImmediate(() => fn(new Error("archive failed")));
            return this;
          },
          pipe: () => this,
          directory: () => {},
          finalize: () => {},
        }) as never,
    };
    await expect(zipDist(distPath, testRoot, outDir, deps)).rejects.toThrow("Zip archive failed");
  });

  it("rejects when archive errors with non-Error", async () => {
    const deps: ZipDistDeps = {
      archiver: () =>
        ({
          on(ev: string, fn: (err?: unknown) => void) {
            if (ev === "error") setImmediate(() => fn("string err"));
            return this;
          },
          pipe: () => this,
          directory: () => {},
          finalize: () => {},
        }) as never,
    };
    await expect(zipDist(distPath, testRoot, outDir, deps)).rejects.toThrow("Zip archive failed");
  });
});
