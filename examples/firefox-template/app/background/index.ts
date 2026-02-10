const EXT_NAME = "[firefox-template]";

console.log(`${EXT_NAME} Background loaded123`);

chrome.runtime.onInstalled.addListener(() => {
  console.log(`${EXT_NAME} Background installed`);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ type: "PONG", from: "background" });
    return true;
  }
  if (message?.type === "GET_VERSION") {
    sendResponse({ version: chrome.runtime.getManifest().version });
    return true;
  }
  return false;
});
