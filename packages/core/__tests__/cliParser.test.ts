import { describe, expect, it } from "@rstest/core";
import {
  CliParser,
  parseCliArgs,
  assertSupportedBrowser,
} from "../src/cliParser.ts";
import { createUnknownCommandError, createInvalidBrowserError } from "../src/errors.ts";

describe("CliParser", () => {
  const parser = new CliParser();

  describe("parse", () => {
    it("parses dev as default command", () => {
      const r = parseCliArgs(["dev"]);
      expect(r.command).toBe("dev");
      expect(r.browser).toBe("chromium");
    });

    it("parses build command", () => {
      const r = parseCliArgs(["build"]);
      expect(r.command).toBe("build");
    });

    it("parses -b chrome", () => {
      const r = parseCliArgs(["build", "-b", "chrome"]);
      expect(r.browser).toBe("chromium");
    });

    it("parses --browser=firefox", () => {
      const r = parseCliArgs(["build", "--browser=firefox"]);
      expect(r.browser).toBe("firefox");
    });

    it("returns unknownBrowser when -b value is invalid", () => {
      const r = parseCliArgs(["build", "-b", "safari"]);
      expect(r.browser).toBe("chromium");
      expect(r.unknownBrowser).toBe("safari");
    });

    it("throws on unknown command", () => {
      expect(() => parser.parse(["unknown"])).toThrow();
      const err = createUnknownCommandError("unknown");
      expect(err.code).toBe("EXTENZO_UNKNOWN_COMMAND");
    });
  });

  describe("assertSupportedBrowser", () => {
    it("does not throw for chrome/chromium/firefox", () => {
      expect(() => assertSupportedBrowser("chrome")).not.toThrow();
      expect(() => assertSupportedBrowser("chromium")).not.toThrow();
      expect(() => assertSupportedBrowser("firefox")).not.toThrow();
    });

    it("throws for invalid browser", () => {
      expect(() => assertSupportedBrowser("safari")).toThrow();
      const err = createInvalidBrowserError("safari");
      expect(err.code).toBe("EXTENZO_INVALID_BROWSER");
    });
  });
});
