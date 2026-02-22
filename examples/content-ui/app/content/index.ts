/**
 * Content script: uses @extenzo/utils defineContentUI + mountContentUI
 * to inject a small UI panel. You can use wrapper: "none" | "shadow" | "iframe".
 */
import { defineContentUI, mountContentUI } from "@extenzo/utils";

const contentUISpec = defineContentUI({
  tag: "div",
  target: "body",
  attr: {
    id: "extenzo-content-ui-root",
    style:
      "position:fixed;bottom:16px;right:16px;padding:12px 16px;background:#1a1a2e;color:#eee;font-size:13px;font-family:system-ui,sans-serif;border-radius:8px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:280px;",
  },
  injectMode: "append",
  wrapper: "shadow",
});

function mountUI(): void {
  const root = mountContentUI(contentUISpec);
  const title = document.createElement("div");
  title.textContent = "Content UI (extenzo)";
  title.style.fontWeight = "600";
  title.style.marginBottom = "8px";
  const desc = document.createElement("div");
  desc.textContent = "This panel is mounted with defineContentUI + mountContentUI (wrapper: shadow).";
  desc.style.fontSize = "12px";
  desc.style.color = "#aaa";
  root.appendChild(title);
  root.appendChild(desc);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
