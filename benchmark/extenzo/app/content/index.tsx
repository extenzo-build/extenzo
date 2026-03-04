import { createRoot } from "react-dom/client";
import { defineShadowContentUI } from "@extenzo/utils";
import { ContentUIApp } from "../source/components/ContentUIApp";

const mountContentUI = defineShadowContentUI({
  target: "body",
  name: 'benchmark-recorder-content-ui',
  attr: {
    id: "benchmark-recorder-content-ui",
    class: "fixed bottom-4 right-4 z-[2147483647] max-w-[320px]",
  },
  injectMode: "append",
});

function mount(): void {
  console.log("mount");
  const container = mountContentUI();
  const root = createRoot(container);
  root.render(<ContentUIApp />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
