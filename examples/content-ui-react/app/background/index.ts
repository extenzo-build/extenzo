console.log("[content-ui-react] Background loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("[content-ui-react] Extension installed");
});
