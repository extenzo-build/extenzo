import browser from "@extenzo/utils/webextension-polyfill";

browser.runtime.onInstalled.addListener(() => {
  console.log("[ffmpeg-worker] Extension installed");
});
