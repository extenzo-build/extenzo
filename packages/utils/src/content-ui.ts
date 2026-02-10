/**
 * Content UI helpers for extension content scripts: define and mount a root element
 * (optionally inside iframe or shadow DOM) into a page target.
 *
 * Usage:
 *   import { defineContentUI, mountContentUI } from "@extenzo/utils";
 *   const spec = defineContentUI({ tag: "div", target: "body", wrapper: "shadow" });
 *   const root = mountContentUI(spec);
 *   root.appendChild(myContent);
 */

export type ContentUIWrapper = "iframe" | "shadow" | "none";
export type ContentUIInjectMode = "append" | "prepend";

export interface DefineContentUIOptions {
  /** Element tag name, e.g. "div", "section" */
  tag: string;
  /** Mount target: CSS selector (document.querySelector) or an Element */
  target: string | Element;
  /** Element attributes (id, class, style, data-*, etc.) */
  attr?: Record<string, string>;
  /**
   * How to insert relative to target: append or prepend.
   * When wrapper is used (iframe/shadow), the wrapper element is also inserted into the target according to this mode.
   */
  injectMode?: ContentUIInjectMode;
  /** Root wrapper: "iframe", "shadow", or "none" */
  wrapper?: ContentUIWrapper;
}

const CONTENT_UI_SPEC = Symbol.for("@extenzo/utils/content-ui-spec");

export interface ContentUISpecBrand {
  readonly [CONTENT_UI_SPEC]: true;
}

export type ContentUISpec = DefineContentUIOptions & ContentUISpecBrand;

function isContentUISpec(value: unknown): value is ContentUISpec {
  return (
    typeof value === "object" &&
    value !== null &&
    CONTENT_UI_SPEC in value &&
    (value as ContentUISpec)[CONTENT_UI_SPEC] === true
  );
}

/**
 * Defines a content UI spec. Use the return value with mountContentUI() when you want to mount.
 */
export function defineContentUI(
  options: DefineContentUIOptions
): ContentUISpec {
  const spec = {
    ...options,
    injectMode: options.injectMode ?? "append",
    wrapper: options.wrapper ?? "none",
    [CONTENT_UI_SPEC]: true as const,
  };
  return spec as ContentUISpec;
}

function resolveTarget(target: string | Element): Element | null {
  if (typeof target === "string") {
    return document.querySelector(target);
  }
  return target;
}

function applyAttrs(
  el: Element,
  attr: Record<string, string> | undefined
): void {
  if (!attr) return;
  for (const [key, value] of Object.entries(attr)) {
    if (key === "style" && typeof value === "string") {
      (el as HTMLElement).style.cssText = value;
    } else {
      el.setAttribute(key, value);
    }
  }
}

function injectChild(
  container: Element,
  child: Element,
  mode: ContentUIInjectMode
): void {
  if (mode === "prepend") {
    container.insertBefore(child, container.firstChild);
  } else {
    container.appendChild(child);
  }
}

function mountNone(spec: ContentUISpec, container: Element): Element {
  const el = document.createElement(spec.tag);
  applyAttrs(el, spec.attr);
  injectChild(container, el, spec.injectMode ?? "append");
  return el;
}

function mountShadow(spec: ContentUISpec, container: Element): ShadowRoot {
  const host = document.createElement(spec.tag);
  applyAttrs(host, spec.attr);
  const shadow = host.attachShadow({ mode: "open" });
  // wrapper (host) is inserted into target according to injectMode
  injectChild(container, host, spec.injectMode ?? "append");
  return shadow;
}

function mountIframe(spec: ContentUISpec, container: Element): HTMLElement {
  const iframe = document.createElement("iframe");
  // wrapper (iframe) is inserted into target according to injectMode
  injectChild(container, iframe, spec.injectMode ?? "append");
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("content-ui: iframe contentDocument not available");
  const root = document.createElement(spec.tag);
  applyAttrs(root, spec.attr);
  doc.body.appendChild(root);
  return root;
}

/**
 * Mounts the UI described by the spec (return value of defineContentUI).
 * Returns the root to append your content to: Element for "none", ShadowRoot for "shadow", HTMLElement for "iframe".
 */
export function mountContentUI(spec: ContentUISpec): Element | ShadowRoot {
  if (!isContentUISpec(spec)) {
    throw new Error(
      "mountContentUI: expected return value of defineContentUI()"
    );
  }
  const container = resolveTarget(spec.target);
  if (!container) {
    throw new Error(
      `content-ui: target not found (${
        typeof spec.target === "string" ? spec.target : "Element"
      })`
    );
  }
  switch (spec.wrapper) {
    case "shadow":
      return mountShadow(spec, container);
    case "iframe":
      return mountIframe(spec, container);
    default:
      return mountNone(spec, container);
  }
}
