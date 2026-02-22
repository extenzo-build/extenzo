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
      expect(r.target).toBeUndefined();
      expect(r.launch).toBeUndefined();
    });

    it("parses build command", () => {
      const r = parseCliArgs(["build"]);
      expect(r.command).toBe("build");
    });

    it("parses -t chromium / -t firefox", () => {
      const r1 = parseCliArgs(["build", "-t", "chromium"]);
      expect(r1.target).toBe("chromium");
      expect(r1.launch).toBeUndefined();
      const r2 = parseCliArgs(["build", "--target=firefox"]);
      expect(r2.target).toBe("firefox");
    });

    it("parses -l chrome", () => {
      const r = parseCliArgs(["build", "-l", "chrome"]);
      expect(r.target).toBeUndefined();
      expect(r.launch).toBe("chrome");
    });

    it("parses --launch=firefox", () => {
      const r = parseCliArgs(["build", "--launch=firefox"]);
      expect(r.target).toBeUndefined();
      expect(r.launch).toBe("firefox");
    });

    it("parses -p/--persist", () => {
      const r = parseCliArgs(["build", "-p"]);
      expect(r.persist).toBe(true);
      const r2 = parseCliArgs(["build", "--persist"]);
      expect(r2.persist).toBe(true);
    });

    it("parses --debug", () => {
      const r = parseCliArgs(["dev", "--debug"]);
      expect(r.debug).toBe(true);
      const r2 = parseCliArgs(["build"]);
      expect(r2.debug).toBeUndefined();
    });

    it("returns unknownLaunch when -l value is invalid", () => {
      const r = parseCliArgs(["build", "-l", "safari"]);
      expect(r.target).toBeUndefined();
      expect(r.launch).toBeUndefined();
      expect(r.unknownLaunch).toBe("safari");
    });

    it("returns unknownTarget when -t value is invalid", () => {
      const r = parseCliArgs(["build", "-t", "safari"]);
      expect(r.target).toBeUndefined();
      expect(r.unknownTarget).toBe("safari");
    });

    it("returns unknownTarget for -t=invalid form", () => {
      const r = parseCliArgs(["build", "-t=unknown"]);
      expect(r.target).toBeUndefined();
      expect(r.unknownTarget).toBe("unknown");
    });

    it("returns unknownLaunch for --launch=invalid form", () => {
      const r = parseCliArgs(["build", "--launch=unknown"]);
      expect(r.launch).toBeUndefined();
      expect(r.unknownLaunch).toBe("unknown");
    });

    it("does not consume next arg as -t value when it starts with -", () => {
      const r = parseCliArgs(["build", "-t", "-next"]);
      expect(r.target).toBeUndefined();
      expect(r.unknownTarget).toBeUndefined();
    });

    it("does not consume next arg as -l value when it starts with -", () => {
      const r = parseCliArgs(["build", "-l", "-next"]);
      expect(r.launch).toBeUndefined();
      expect(r.unknownLaunch).toBeUndefined();
    });

    it("throws on unknown command", () => {
      expect(() => parser.parse(["unknown"])).toThrow();
      const err = createUnknownCommandError("unknown");
      expect(err.code).toBe("EXTENZO_UNKNOWN_COMMAND");
    });
  });

  describe("assertSupportedBrowser", () => {
    it("does not throw for chrome/edge/chromium/firefox", () => {
      expect(() => assertSupportedBrowser("chrome")).not.toThrow();
      expect(() => assertSupportedBrowser("edge")).not.toThrow();
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
