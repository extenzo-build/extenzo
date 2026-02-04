import browser from "@extenzo/utils/webextension-polyfill";

function openVideoPanel(): void {
  const url = browser.runtime.getURL("videopanel/videopanel.html");
  browser.tabs.create({ url });
}

function init(): void {
  const app = document.getElementById("app");
  if (!app) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "打开 Video Panel";
  btn.style.cssText = "padding:10px 16px;cursor:pointer;font-size:14px;";
  btn.addEventListener("click", openVideoPanel);
  app.appendChild(btn);
}

init();
