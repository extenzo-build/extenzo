import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "@rstest/core";
import { ConfigLoader, loadConfigFile, resolveExtenzoConfig } from "../src/configLoader.ts";
import {
  createConfigNotFoundError,
  createManifestMissingError,
  createNoEntriesError,
  createAppDirMissingError,
} from "../src/errors.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures", "config-loader");
const minimalFixtureDir = path.join(__dirname, "fixtures", "config-loader-minimal");
const modExportsFixtureDir = path.join(__dirname, "fixtures", "config-loader-mod-exports");
const emptyDir = path.join(__dirname, "fixtures");

describe("ConfigLoader", () => {
  describe("loadConfigFile", () => {
    it("returns null when no config file exists", () => {
      const result = loadConfigFile(emptyDir);
      expect(result).toBeNull();
    });

    it("loads exo.config.js and returns user config", () => {
      const result = loadConfigFile(fixtureDir);
      expect(result).not.toBeNull();
      expect(result?.manifest?.name).toBe("Fixture");
      expect(result?.appDir).toBe("src");
    });

    it("loads exo.config.js with module.exports (no default) and returns config", () => {
      const result = loadConfigFile(modExportsFixtureDir);
      expect(result).not.toBeNull();
      expect(result?.manifest?.name).toBe("ModExports");
      expect(result?.appDir).toBe("src");
    });
  });

  describe("resolve", () => {
    it("throws when no config file exists", () => {
      const loader = new ConfigLoader();
      expect(() => loader.resolve(emptyDir)).toThrow();
      const err = createConfigNotFoundError(emptyDir);
      expect(err.code).toBe("EXTENZO_CONFIG_NOT_FOUND");
    });

    it("returns config, baseEntries, entries when config and entries exist", () => {
      const { config, baseEntries, entries } = resolveExtenzoConfig(fixtureDir);
      expect(config.root).toBe(fixtureDir);
      expect(config.appDir).toMatch(/config-loader[\\/]src$/);
      expect(config.outDir).toBe("dist");
      expect(config.outputRoot).toBe(".extenzo");
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.map((e) => e.name)).toContain("background");
    });

    it("uses default appDir and outDir when not set in config", () => {
      const { config, entries } = resolveExtenzoConfig(minimalFixtureDir);
      expect(config.appDir).toBe(path.join(minimalFixtureDir, "app"));
      expect(config.outDir).toBe("dist");
      expect(entries.some((e) => e.name === "background")).toBe(true);
    });

    it("returns empty baseEntries and entries when entry is false", () => {
      const entryDisabledDir = path.join(__dirname, "fixtures", "config-entry-disabled");
      const { config, baseEntries, entries } = resolveExtenzoConfig(entryDisabledDir);
      expect(config.entry).toBe(false);
      expect(config.manifest?.name).toBe("EntryDisabled");
      expect(baseEntries).toEqual([]);
      expect(entries).toEqual([]);
    });
  });
});

describe("resolveExtenzoConfig with invalid config", () => {
  it("throws when manifest is missing", () => {
    const noManifestDir = path.join(__dirname, "fixtures", "config-no-manifest");
    expect(() => resolveExtenzoConfig(noManifestDir)).toThrow();
    const err = createManifestMissingError();
    expect(err.code).toBe("EXTENZO_MANIFEST_MISSING");
  });

  it("throws when no entries discovered", () => {
    const noEntriesDir = path.join(__dirname, "fixtures", "config-no-entries");
    expect(() => resolveExtenzoConfig(noEntriesDir)).toThrow();
    const err = createNoEntriesError(noEntriesDir);
    expect(err.code).toBe("EXTENZO_NO_ENTRIES");
  });

  it("throws when appDir does not exist", () => {
    const missingAppDir = path.join(__dirname, "fixtures", "config-srcdir-missing");
    expect(() => resolveExtenzoConfig(missingAppDir)).toThrow();
    const err = createAppDirMissingError(path.join(missingAppDir, "app"));
    expect(err.code).toBe("EXTENZO_APP_DIR_MISSING");
  });
});

describe("loadConfigFile throws on load error", () => {
  it("throws createConfigLoadError when config file throws", () => {
    const loadErrorDir = path.join(__dirname, "fixtures", "config-load-error");
    const loader = new ConfigLoader();
    expect(() => loader.loadConfigFile(loadErrorDir)).toThrow("Failed to load config file");
  });
});
