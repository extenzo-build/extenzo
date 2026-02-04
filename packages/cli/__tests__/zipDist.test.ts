import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { zipDist } from "../src/zipDist.ts";

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

});
