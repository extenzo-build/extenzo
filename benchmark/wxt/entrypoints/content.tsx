import "../source/styles/index.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  main(ctx: any) {
    const ui = createIframeUi(ctx, {
      page: "/content-ui.html",
      position: "inline",
      anchor: "body",
      onMount: (wrapper: HTMLElement, iframe: HTMLIFrameElement) => {
        wrapper.className = "fixed bottom-4 right-4 z-[2147483647] max-w-[320px]";
        iframe.style.width = "320px";
        iframe.style.height = "220px";
        iframe.style.border = "0";
        iframe.style.background = "transparent";
        iframe.style.borderRadius = "12px";
        iframe.style.overflow = "hidden";
      },
    });
    ui.mount();
  },
});
