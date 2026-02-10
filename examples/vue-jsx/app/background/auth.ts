import {
  getUserSecure,
  saveUserSecure,
  removeUserSecure,
  migratePlainUserIfAny,
} from "./secureUser";

export async function getUser() {
  // Attempt secure retrieval
  const secure = await getUserSecure();
  if (secure) return secure;
  // Migrate legacy plain user if present
  await migratePlainUserIfAny();
  return await getUserSecure();
}

export function injectAuth() {
  // Script injected into target pages: relays auth messages to background
  function pageBridge() {
    if (
      !location.host.includes("videoroll.app") &&
      !location.href.includes("videoroll.app")
    )
      return;
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "videoroll_auth_signin" && data.data?.user) {
        chrome.runtime.sendMessage({
          type: "videoroll_auth_signin",
          user: data.data.user,
        });
      } else if (data.type === "videoroll_auth_signout") {
        chrome.runtime.sendMessage({ type: "videoroll_auth_signout" });
      }
    });
  }

  // Background listener handles secure storage (not accessible from page context)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "videoroll_auth_signin" && msg.user) {
      saveUserSecure(msg.user)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true; // async
    }
    if (msg.type === "videoroll_auth_signout") {
      removeUserSecure()
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
  });

  chrome.tabs.onUpdated.addListener(function listener(tabId) {
    chrome.scripting.executeScript({
      target: { tabId },
      func: pageBridge,
    });
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const { tabId } = activeInfo;

    chrome.scripting.executeScript({
      target: { tabId },
      func: pageBridge,
    });
  });

  chrome.tabs.onHighlighted.addListener(async (activeInfo) => {
    const { tabIds } = activeInfo;

    tabIds.forEach((tabId) => {
      chrome.scripting.executeScript({
        target: { tabId },
        func: pageBridge,
      });
    });
  });

  chrome.tabs.onReplaced.addListener(async (addedTabId) => {
    chrome.scripting.executeScript({
      target: { tabId: addedTabId },
      func: pageBridge,
    });
  });
}
