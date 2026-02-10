import { describe, expect, it } from "@rstest/core";
import { defineContentUI, mountContentUI } from "../src/content-ui";

describe("content-ui", () => {
  describe("defineContentUI", () => {
    it("returns spec with tag, target, defaults for injectMode and wrapper", () => {
      const spec = defineContentUI({ tag: "div", target: "body" });
      expect(spec.tag).toBe("div");
      expect(spec.target).toBe("body");
      expect(spec.injectMode).toBe("append");
      expect(spec.wrapper).toBe("none");
    });

    it("accepts injectMode and wrapper", () => {
      const spec = defineContentUI({
        tag: "section",
        target: "#root",
        injectMode: "prepend",
        wrapper: "shadow",
      });
      expect(spec.injectMode).toBe("prepend");
      expect(spec.wrapper).toBe("shadow");
    });

    it("accepts attr", () => {
      const spec = defineContentUI({
        tag: "div",
        target: "body",
        attr: { id: "app", class: "container" },
      });
      expect(spec.attr).toEqual({ id: "app", class: "container" });
    });
  });

  describe("mountContentUI", () => {
    it("throws when given non-spec", () => {
      expect(() => mountContentUI({ tag: "div", target: "body" } as never)).toThrow(
        /expected return value of defineContentUI/
      );
    });
  });
});
