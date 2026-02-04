import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "@rstest/core";
import { ConfigLoader, loadConfigFile, resolveExtenzoConfig } from "../src/configLoader.ts";
import { createConfigNotFoundError, createManifestMissingError } from "../src/errors.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures", "config-loader");
const emptyDir = path.join(__dirname, "fixtures");

describe("ConfigLoader", () => {
  describe("loadConfigFile", () => {
    it("returns null when no config file exists", () => {
      const result = loadConfigFile(emptyDir);
      expect(result).toBeNull();
    });

    it("loads ext.config.js and returns user config", () => {
      const result = loadConfigFile(fixtureDir);
      expect(result).not.toBeNull();
      expect(result?.manifest?.name).toBe("Fixture");
      expect(result?.srcDir).toBe("src");
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
      expect(config.srcDir).toMatch(/config-loader[\\/]src$/);
      expect(config.outDir).toBe("dist");
      expect(config.outputRoot).toBe(".extenzo");
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.map((e) => e.name)).toContain("background");
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
});

describe("loadConfigFile throws on load error", () => {
  it("throws createConfigLoadError when config file throws", () => {
    const loadErrorDir = path.join(__dirname, "fixtures", "config-load-error");
    const loader = new ConfigLoader();
    expect(() => loader.loadConfigFile(loadErrorDir)).toThrow("加载配置文件失败");
  });
});
