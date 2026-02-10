import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "@rstest/core";
import {
  EntryDiscoverer,
  discoverEntries,
  getHtmlEntryNames,
  getScriptOnlyEntryNames,
} from "../src/entryDiscoverer.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures", "entry-discovery");

describe("EntryDiscoverer", () => {
  describe("getHtmlEntryNames", () => {
    it("returns popup, options, sidepanel, devtools, offscreen", () => {
      expect(getHtmlEntryNames()).toEqual(["popup", "options", "sidepanel", "devtools", "offscreen"]);
    });
  });

  describe("getScriptOnlyEntryNames", () => {
    it("returns background, content", () => {
      expect(getScriptOnlyEntryNames()).toEqual(["background", "content"]);
    });
  });

  describe("discover", () => {
    it("finds background and devtools entries in fixture dir", () => {
      const entries = discoverEntries(fixtureDir);
      const names = entries.map((e) => e.name).sort();
      expect(names).toContain("background");
      expect(names).toContain("devtools");
      const bg = entries.find((e) => e.name === "background");
      const dev = entries.find((e) => e.name === "devtools");
      expect(bg?.scriptPath).toMatch(/background[\\/]index\.ts$/);
      expect(bg?.htmlPath).toBeUndefined();
      expect(dev?.scriptPath).toMatch(/devtools[\\/]index\.ts$/);
      expect(dev?.htmlPath).toMatch(/devtools[\\/]index\.html$/);
    });

    it("returns empty array for dir with no entry subdirs", () => {
      const discoverer = new EntryDiscoverer();
      const entries = discoverer.discover(path.join(__dirname, "fixtures"));
      expect(entries).toEqual([]);
    });

    it("finds html-only entry when data-extenzo-entry script exists", () => {
      const entries = discoverEntries(fixtureDir);
      const sidepanel = entries.find((e) => e.name === "sidepanel");
      expect(sidepanel).toBeDefined();
      expect(sidepanel?.htmlPath).toMatch(/sidepanel[\\/]index\.html$/);
      expect(sidepanel?.scriptPath).toMatch(/sidepanel[\\/]main\.ts$/);
      expect(sidepanel?.scriptInject).toBe("body");
    });

    it("skips path that is file not directory", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `extenzo-discover-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "background"), "file not dir", "utf-8");
      const discoverer = new EntryDiscoverer();
      const entries = discoverer.discover(dir);
      expect(entries).toEqual([]);
      rmSync(dir, { recursive: true, force: true });
    });

    it("finds script-only entry as single file at base (e.g. background.js)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `extenzo-discover-single-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "background.js"), "// script", "utf-8");
      const discoverer = new EntryDiscoverer();
      const entries = discoverer.discover(dir);
      expect(entries.some((e) => e.name === "background")).toBe(true);
      expect(entries.find((e) => e.name === "background")?.htmlPath).toBeUndefined();
      rmSync(dir, { recursive: true, force: true });
    });

    it("finds html entry as single files at base (popup.html + popup.ts)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `extenzo-discover-html-single-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "popup.html"), "<html></html>", "utf-8");
      writeFileSync(join(dir, "popup.ts"), "// script", "utf-8");
      const discoverer = new EntryDiscoverer();
      const entries = discoverer.discover(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.scriptPath).toMatch(/popup\.ts$/);
      expect(popup?.htmlPath).toMatch(/popup\.html$/);
      rmSync(dir, { recursive: true, force: true });
    });

    it("skips html-only when script from HTML does not exist (singleHtml, no resolved)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `extenzo-discover-html-only-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "popup.html"),
        '<html><script data-extenzo-entry src="./popup.ts"></script></html>',
        "utf-8"
      );
      const discoverer = new EntryDiscoverer();
      const entries = discoverer.discover(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeUndefined();
      rmSync(dir, { recursive: true, force: true });
    });

    it("finds html entry from singleHtml when script from HTML exists (resolved branch)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `extenzo-discover-single-html-resolved-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "popup.html"),
        '<html><script data-extenzo-entry src="./main.ts"></script></html>',
        "utf-8"
      );
      writeFileSync(join(dir, "main.ts"), "// entry", "utf-8");
      const discoverer = new EntryDiscoverer();
      const entries = discoverer.discover(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.scriptPath).toMatch(/main\.ts$/);
      expect(popup?.htmlPath).toMatch(/popup\.html$/);
      expect(popup?.scriptInject).toBe("body");
      rmSync(dir, { recursive: true, force: true });
    });

    it("skips when singleHtml path is not readable (e.g. dir as popup.html, catch branch)", async () => {
      const { mkdirSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `extenzo-discover-bad-html-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      mkdirSync(join(dir, "popup.html"));
      const discoverer = new EntryDiscoverer();
      const entries = discoverer.discover(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeUndefined();
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
