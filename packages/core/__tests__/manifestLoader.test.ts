import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { resolveManifestInput } from "../src/manifestLoader.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureSrc = path.join(__dirname, "fixtures", "manifest-loader", "src");

describe("ManifestLoader", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `extenzo-manifest-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
  });

  describe("resolve with null/undefined", () => {
    it("loads from srcDir when manifest.json exists", () => {
      const result = resolveManifestInput(undefined, "/root", fixtureSrc);
      expect(result).not.toBeNull();
      expect((result as { chromium?: { name?: string } }).chromium?.name).toBe("Fixture");
    });

    it("loads from srcDir/manifest when no manifest in srcDir but in subdir", () => {
      const subdirOnly = path.join(tempDir, "subdir-only");
      mkdirSync(path.join(subdirOnly, "manifest"), { recursive: true });
      writeFileSync(
        path.join(subdirOnly, "manifest", "manifest.json"),
        '{"name":"SubdirOnly","version":"1.0.0","manifest_version":3}',
        "utf-8"
      );
      const resultSub = resolveManifestInput(null, "/root", subdirOnly);
      expect(resultSub).not.toBeNull();
      expect((resultSub as { chromium?: { name?: string } }).chromium?.name).toBe("SubdirOnly");
    });

    it("returns null when no manifest files exist", () => {
      const result = resolveManifestInput(null, "/root", tempDir);
      expect(result).toBeNull();
    });
  });

  describe("resolve with path config", () => {
    it("loads chromium and firefox from paths", () => {
      const chromiumPath = path.join(tempDir, "manifest.json");
      const firefoxPath = path.join(tempDir, "firefox.json");
      writeFileSync(chromiumPath, '{"name":"Chromium","version":"1.0.0","manifest_version":3}', "utf-8");
      writeFileSync(firefoxPath, '{"name":"Firefox","version":"1.0.0","manifest_version":3}', "utf-8");
      const result = resolveManifestInput(
        { chromium: "manifest.json", firefox: "firefox.json" },
        "/root",
        tempDir
      );
      expect(result).not.toBeNull();
      expect((result as { chromium?: { name?: string } }).chromium?.name).toBe("Chromium");
      expect((result as { firefox?: { name?: string } }).firefox?.name).toBe("Firefox");
    });

    it("returns null when path config but files missing", () => {
      const result = resolveManifestInput(
        { chromium: "nonexistent.json", firefox: "also-missing.json" },
        "/root",
        tempDir
      );
      expect(result).toBeNull();
    });
  });

  describe("resolve with chromium/firefox object", () => {
    it("returns input when chromium/firefox object", () => {
      const config = { chromium: { name: "C", version: "1.0.0" }, firefox: { name: "F", version: "1.0.0" } };
      const result = resolveManifestInput(config, "/root", tempDir);
      expect(result).toBe(config);
      expect((result as { chromium?: { name?: string } }).chromium?.name).toBe("C");
    });
  });

  describe("resolve with plain object", () => {
    it("returns input as single manifest", () => {
      const config = { name: "Plain", version: "1.0.0", manifest_version: 3 };
      const result = resolveManifestInput(config, "/root", tempDir);
      expect(result).toEqual(config);
    });
  });

  describe("buildConfigFromFiles and deepMerge", () => {
    it("merges base with chromium and firefox overrides", () => {
      const dir = path.join(tempDir, "merge");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "manifest.json"),
        '{"name":"Base","version":"1.0.0","manifest_version":3}',
        "utf-8"
      );
      writeFileSync(
        path.join(dir, "manifest.chromium.json"),
        '{"name":"Chromium"}',
        "utf-8"
      );
      writeFileSync(
        path.join(dir, "manifest.firefox.json"),
        '{"name":"Firefox"}',
        "utf-8"
      );
      const result = resolveManifestInput(null, "/root", dir);
      expect(result).not.toBeNull();
      expect((result as { chromium?: { name?: string } }).chromium?.name).toBe("Chromium");
      expect((result as { firefox?: { name?: string } }).firefox?.name).toBe("Firefox");
    });
  });

  describe("readManifestJson edge cases", () => {
    it("returns null for invalid JSON in file", () => {
      const badPath = path.join(tempDir, "bad.json");
      writeFileSync(badPath, "not json {", "utf-8");
      const result = resolveManifestInput({ chromium: "bad.json" }, "/root", tempDir);
      expect(result).toBeNull();
    });

    it("returns null for primitive JSON", () => {
      const primPath = path.join(tempDir, "prim.json");
      writeFileSync(primPath, "1", "utf-8");
      const result = resolveManifestInput({ chromium: "prim.json" }, "/root", tempDir);
      expect(result).toBeNull();
    });
  });
});
