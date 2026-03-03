/**
 * Shared background script logic: tab capture + offscreen recording.
 * Used by extenzo/wxt/plasmo entrypoints.
 */
const OFFSCREEN_PATH = "offscreen/index.html";

async function ensureOffscreenDocument(): Promise<void> {
  const url = chrome.runtime.getURL(OFFSCREEN_PATH);
  const existing = await (chrome.runtime as unknown as { getContexts: (o: { contextTypes: string[]; documentUrls?: string[] }) => Promise<unknown[]> }).getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [url],
  });
  if (Array.isArray(existing) && existing.length > 0) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["USER_MEDIA" as chrome.offscreen.Reason],
    justification: "Recording tab via chrome.tabCapture",
  });
}

chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; target?: string; data?: string },
    _sender,
    sendResponse
  ) => {
    if (msg.type === "open-options") {
      chrome.runtime.openOptionsPage().finally(() => sendResponse(undefined));
      return true;
    }
    if (msg.type === "start-recording") {
      (async () => {
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (!tab?.id) {
            sendResponse({ ok: false, error: "No active tab" });
            return;
          }
          const streamId = await chrome.tabCapture.getMediaStreamId({
            targetTabId: tab.id,
          });
          await ensureOffscreenDocument();
          chrome.runtime.sendMessage({
            type: "start-recording",
            target: "offscreen",
            data: streamId,
          });
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      })();
      return true;
    }
    if (msg.type === "stop-recording") {
      chrome.runtime.sendMessage({ type: "stop-recording", target: "offscreen" });
      sendResponse({ ok: true });
      return true;
    }
    return false;
  }
);
