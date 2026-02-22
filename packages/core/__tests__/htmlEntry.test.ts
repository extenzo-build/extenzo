import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { describe, expect, it, afterEach } from "@rstest/core";
import {
  parseExtenzoEntryFromHtml,
  getScriptInjectIfMatches,
  type ExtenzoEntryScriptResult,
} from "../src/htmlEntry.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("htmlEntry", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  describe("parseExtenzoEntryFromHtml", () => {
    it("returns undefined when no data-extenzo-entry script", () => {
      tempDir = path.join(tmpdir(), `htmlEntry-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      const htmlPath = path.join(tempDir, "index.html");
      writeFileSync(htmlPath, "<html><body>no entry</body></html>", "utf-8");
      expect(parseExtenzoEntryFromHtml(htmlPath)).toBeUndefined();
    });

    it("returns undefined when script has no src", () => {
      tempDir = path.join(tmpdir(), `htmlEntry-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      const htmlPath = path.join(tempDir, "index.html");
      writeFileSync(
        htmlPath,
        '<html><script data-extenzo-entry>console.log(1);</script></html>',
        "utf-8"
      );
      expect(parseExtenzoEntryFromHtml(htmlPath)).toBeUndefined();
    });

    it("returns src, inject head, and strippedHtml when script in head", () => {
      tempDir = path.join(tmpdir(), `htmlEntry-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      const htmlPath = path.join(tempDir, "index.html");
      writeFileSync(
        htmlPath,
        '<html><head><script data-extenzo-entry src="./main.ts"></script></head><body></body></html>',
        "utf-8"
      );
      const result = parseExtenzoEntryFromHtml(htmlPath) as ExtenzoEntryScriptResult;
      expect(result.src).toBe("./main.ts");
      expect(result.inject).toBe("head");
      expect(result.strippedHtml).not.toContain("data-extenzo-entry");
    });

    it("returns inject body when script in body", () => {
      tempDir = path.join(tmpdir(), `htmlEntry-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      const htmlPath = path.join(tempDir, "index.html");
      writeFileSync(
        htmlPath,
        '<html><head></head><body><script data-extenzo-entry src="./main.ts"></script></body></html>',
        "utf-8"
      );
      const result = parseExtenzoEntryFromHtml(htmlPath) as ExtenzoEntryScriptResult;
      expect(result.inject).toBe("body");
    });
  });

  describe("getScriptInjectIfMatches", () => {
    it("returns undefined when htmlPath does not exist (catch branch)", () => {
      const result = getScriptInjectIfMatches("/nonexistent/path.html", "/any/script.ts");
      expect(result).toBeUndefined();
    });

    it("returns undefined when parsed is undefined", () => {
      tempDir = path.join(tmpdir(), `htmlEntry-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      const htmlPath = path.join(tempDir, "no-entry.html");
      writeFileSync(htmlPath, "<html></html>", "utf-8");
      const scriptPath = path.join(tempDir, "main.ts");
      expect(getScriptInjectIfMatches(htmlPath, scriptPath)).toBeUndefined();
    });

    it("returns inject when resolved path matches scriptPath", () => {
      tempDir = path.join(tmpdir(), `htmlEntry-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      const htmlPath = path.join(tempDir, "popup.html");
      const scriptPath = path.join(tempDir, "main.ts");
      writeFileSync(htmlPath, '<html><script data-extenzo-entry src="./main.ts"></script></html>', "utf-8");
      expect(getScriptInjectIfMatches(htmlPath, scriptPath)).toBe("body");
    });

    it("returns undefined when resolved path does not match scriptPath", () => {
      tempDir = path.join(tmpdir(), `htmlEntry-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      const htmlPath = path.join(tempDir, "popup.html");
      writeFileSync(htmlPath, '<html><script data-extenzo-entry src="./other.ts"></script></html>', "utf-8");
      expect(getScriptInjectIfMatches(htmlPath, path.join(tempDir, "main.ts"))).toBeUndefined();
    });
  });
});
