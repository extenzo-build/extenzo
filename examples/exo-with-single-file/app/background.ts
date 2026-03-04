const EXT_NAME = "[single-file-template]";

chrome.runtime.onInstalled.addListener(() => {
  console.log(`${EXT_NAME} Background installed`);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ type: "PONG", from: "background" });
    return true;
  }
  return false;
});
