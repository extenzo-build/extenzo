console.log("[content-ui] Background loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("[content-ui] Extension installed");
});
