import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "@rstest/core";
import { EntryResolver, resolveEntries } from "../src/entryResolver.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures", "entry-discovery");

describe("EntryResolver", () => {
  describe("resolve with no entry config", () => {
    it("delegates to discover and returns discovered entries", () => {
      const entries = resolveEntries({}, "/root", fixtureDir);
      const names = entries.map((e) => e.name).sort();
      expect(names).toContain("background");
      expect(names).toContain("devtools");
    });
  });

  describe("resolve with empty entry config", () => {
    it("delegates to discover", () => {
      const entries = resolveEntries({ entry: {} }, "/root", fixtureDir);
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe("resolve with entry config", () => {
    it("uses entry paths when files exist", () => {
      const entries = resolveEntries(
        { entry: { background: "background/index.ts", devtools: "devtools/index.ts" } },
        "/root",
        fixtureDir
      );
      expect(entries.find((e) => e.name === "background")?.scriptPath).toMatch(/background[\\/]index\.ts$/);
      expect(entries.find((e) => e.name === "devtools")?.scriptPath).toMatch(/devtools[\\/]index\.ts$/);
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it("skips non-existent paths and falls back to discover when none exist", () => {
      const emptyDir = path.join(__dirname, "fixtures");
      const entries = resolveEntries(
        { entry: { background: "nonexistent/index.ts" } },
        "/root",
        emptyDir
      );
      expect(entries).toEqual([]);
    });

    it("resolves html path and finds script in same dir", () => {
      const entries = resolveEntries(
        { entry: { popup: "popup/index.html" } },
        "/root",
        fixtureDir
      );
      const popupEntry = entries.find((e) => e.name === "popup");
      expect(popupEntry).toBeDefined();
      expect(popupEntry?.htmlPath).toMatch(/popup[\\/]index\.html$/);
      expect(popupEntry?.scriptPath).toMatch(/popup[\\/]index\.ts$/);
    });

    it("resolves script path and infers htmlPath for popup when index.html exists", () => {
      const entries = resolveEntries(
        { entry: { popup: "popup/index.ts" } },
        "/root",
        fixtureDir
      );
      const popupEntry = entries.find((e) => e.name === "popup");
      expect(popupEntry).toBeDefined();
      expect(popupEntry?.htmlPath).toMatch(/popup[\\/]index\.html$/);
    });

    it("resolves script path without htmlPath for background", () => {
      const entries = resolveEntries(
        { entry: { background: "background/index.ts" } },
        "/root",
        fixtureDir
      );
      const bg = entries.find((e) => e.name === "background");
      expect(bg?.htmlPath).toBeUndefined();
    });

    it("resolves html path with stem script (not index) when no index in dir", () => {
      const entries = resolveEntries(
        { entry: { options: "options/other.html" } },
        "/root",
        fixtureDir
      );
      const optionsEntry = entries.find((e) => e.name === "options");
      expect(optionsEntry).toBeDefined();
      expect(optionsEntry?.scriptPath?.endsWith("other.ts")).toBe(true);
    });

    it("returns null for non-script non-html path", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const emptyDir = join(tmpdir(), `extenzo-entry-${Date.now()}`);
      mkdirSync(emptyDir, { recursive: true });
      writeFileSync(join(emptyDir, "readme.txt"), "not script or html", "utf-8");
      const entries = resolveEntries(
        { entry: { custom: "readme.txt" } },
        "/root",
        emptyDir
      );
      expect(entries.some((e) => e.name === "custom")).toBe(false);
      rmSync(emptyDir, { recursive: true, force: true });
    });
  });
});
