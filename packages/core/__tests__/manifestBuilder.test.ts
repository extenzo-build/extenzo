import { describe, expect, it } from "@rstest/core";
import { ManifestBuilder, resolveManifestChromium, resolveManifestFirefox } from "../src/manifestBuilder.ts";
import { MANIFEST_ENTRY_PATHS } from "../src/constants.ts";
import type { EntryInfo } from "../src/types.ts";

function entry(name: string, scriptPath: string, htmlPath?: string): EntryInfo {
  return { name, scriptPath, htmlPath };
}

describe("ManifestBuilder", () => {
  const baseManifest = {
    name: "Test",
    version: "0.0.1",
    manifest_version: 3,
  };

  describe("buildForBrowser", () => {
    it("injects background when entry present", () => {
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(
        { chromium: baseManifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      expect(out).toHaveProperty("background");
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        MANIFEST_ENTRY_PATHS.background
      );
    });

    it("injects content_scripts when content entry present", () => {
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(
        { chromium: baseManifest },
        [entry("content", "/c/index.js")],
        "chromium"
      );
      expect(out).toHaveProperty("content_scripts");
      expect(out.content_scripts).toEqual(MANIFEST_ENTRY_PATHS.contentScripts);
    });

    it("injects devtools_page when devtools entry present", () => {
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(
        { chromium: baseManifest },
        [entry("devtools", "/d/index.js", "/d/index.html")],
        "chromium"
      );
      expect(out).toHaveProperty("devtools_page");
      expect((out as { devtools_page?: string }).devtools_page).toBe(MANIFEST_ENTRY_PATHS.devtools);
    });

    it("uses chromium branch when browser is chromium", () => {
      const chromiumManifest = { ...baseManifest, name: "Chromium" };
      const firefoxManifest = { ...baseManifest, name: "Firefox" };
      const config = { chromium: chromiumManifest, firefox: firefoxManifest };
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(config, [], "chromium");
      expect((out as { name?: string }).name).toBe("Chromium");
    });

    it("uses firefox branch when browser is firefox", () => {
      const chromiumManifest = { ...baseManifest, name: "Chromium" };
      const firefoxManifest = { ...baseManifest, name: "Firefox" };
      const config = { chromium: chromiumManifest, firefox: firefoxManifest };
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(config, [], "firefox");
      expect((out as { name?: string }).name).toBe("Firefox");
    });
  });

  describe("resolveManifestChromium / resolveManifestFirefox", () => {
    it("resolveManifestChromium returns chromium manifest with entry paths", () => {
      const out = resolveManifestChromium(
        { chromium: baseManifest },
        [entry("popup", "/p/index.js", "/p/index.html"), entry("background", "/b/index.js")]
      );
      expect((out as { action?: { default_popup: string } }).action?.default_popup).toBe(
        MANIFEST_ENTRY_PATHS.popup
      );
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        MANIFEST_ENTRY_PATHS.background
      );
    });

    it("resolveManifestFirefox returns firefox manifest", () => {
      const out = resolveManifestFirefox({ firefox: baseManifest }, []);
      expect((out as { name?: string }).name).toBe("Test");
    });
  });

  describe("options and sidepanel", () => {
    it("injects options_ui when options entry present", () => {
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(
        { chromium: baseManifest },
        [entry("options", "/o/index.js", "/o/index.html")],
        "chromium"
      );
      expect(out).toHaveProperty("options_ui");
      expect((out as { options_ui?: { page: string } }).options_ui?.page).toBe(
        MANIFEST_ENTRY_PATHS.options
      );
    });

    it("injects side_panel when sidepanel entry present", () => {
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(
        { chromium: baseManifest },
        [entry("sidepanel", "/s/index.js", "/s/index.html")],
        "chromium"
      );
      expect(out).toHaveProperty("side_panel");
      expect((out as { side_panel?: { default_path: string } }).side_panel?.default_path).toBe(
        MANIFEST_ENTRY_PATHS.sidepanel
      );
    });

    it("uses firefox fallback to chromium when firefox undefined", () => {
      const config = { chromium: { ...baseManifest, name: "C" } };
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(config, [], "firefox");
      expect((out as { name?: string }).name).toBe("C");
    });

    it("uses chromium fallback to firefox when chromium undefined", () => {
      const config = { firefox: { ...baseManifest, name: "F" } };
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(config, [], "chromium");
      expect((out as { name?: string }).name).toBe("F");
    });
  });
});
