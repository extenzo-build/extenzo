import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "@rstest/core";
import { EntryResolver, resolveEntries } from "../src/entryResolver.js";

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
      expect(entries).toHaveLength(2);
      expect(entries.find((e) => e.name === "background")?.scriptPath).toMatch(/background[\\/]index\.ts$/);
      expect(entries.find((e) => e.name === "devtools")?.scriptPath).toMatch(/devtools[\\/]index\.ts$/);
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
  });
});
