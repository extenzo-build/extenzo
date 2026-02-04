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
    it("returns popup, options, sidepanel, devtools", () => {
      expect(getHtmlEntryNames()).toEqual(["popup", "options", "sidepanel", "devtools"]);
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

    it("skips html entry dir when no script (only index.html)", () => {
      const entries = discoverEntries(fixtureDir);
      const sidepanel = entries.find((e) => e.name === "sidepanel");
      expect(sidepanel).toBeUndefined();
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
  });
});
