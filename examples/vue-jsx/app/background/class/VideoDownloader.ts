import { nanoid } from "nanoid";
import { ActionType, IRollConfig } from "app/types/type.d";
import { createURL } from "app/util";
import browser from "webextension-polyfill";

export default class VideoDownloader {
  downloadList: any[] = [];

  // 监听器引用管理
  private messageListener:
    | ((
        message: any,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
      ) => boolean | void)
    | null = null;

  constructor() {
    this.onDownloadListener();
  }

  listenDownloadChange() {
    chrome.downloads.onChanged.addListener(function (item) {
      const errorList = [
        "SERVER_BAD_CONTENT",
        "SERVER_UNAUTHORIZED",
        "SERVER_FORBIDDEN",
        "SERVER_UNREACHABLE",
        "SERVER_CROSS_ORIGIN_REDIRECT",
        "SERVER_FAILED",
        "NETWORK_FAILED",
      ];
    });
  }

  onDownloadListener() {
    // 移除旧的监听器（如果存在）
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
    }

    // 创建新的监听器
    this.messageListener = (message, sender, sendResponse) => {
     
      const { rollConfig, type, tabId, videoInfo, favIcon } = message;

      if (!videoInfo) return;

      switch (type) {
        case ActionType.DOWNLOAD_SINGLE_VIDEO:
          if (videoInfo.type === "MP4") {
            this.downloadMP4(videoInfo, tabId);
          } else if (videoInfo.type === "HLS") {
            this.downloadHLS(videoInfo, rollConfig, favIcon);
          }
          break;
        default:
          break;
      }
      sendResponse("ok");
      return true;
    };

    // 添加监听器
    chrome.runtime.onMessage.addListener(this.messageListener);
  }

  /**
   * 移除所有监听器，清理资源
   */
  remove() {
    // 移除消息监听器
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }
    // 清理下载列表
    this.downloadList = [];
  }

  downloadMP4(videoInfo: any, tabId?: number) {
    const url = videoInfo?.url;
    if (!url) return;

    const hasVideoExt = (u: string) =>
      /\.(mp4|m4v|mov|webm|mkv|flv|ts|avi|m4s|mpd)(?:[?#].*)?$/i.test(u);
    const safeTitle = (t: string) =>
      String(t || `video_${Date.now()}`).replace(/[\\/:*?"<>|]/g, "_").trim();
    const suggestName = () => {
      const base = safeTitle(videoInfo?.title);
      return base.toLowerCase().endsWith(".mp4") ? base : `${base}.mp4`;
    };

    const isExt = hasVideoExt(url);

    // Case 1: URL has a video extension -> inject anchor in page to preserve Referer
    if (isExt) {
      if (typeof tabId === "number") {
        try {
          const scriptingApi = (browser as any)?.scripting || (chrome as any)?.scripting;
          if (scriptingApi && typeof scriptingApi.executeScript === "function") {
            scriptingApi
              .executeScript({
                target: { tabId },
                world: "MAIN",
                func: (u: string) => {
                  try {
                    const a = document.createElement("a");
                    a.href = u;
                    a.target = "_blank";
                    // No filename override; let server/URL decide
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } catch (e) {
                    try { window.open(u, "_blank"); } catch {}
                  }
                },
                args: [url],
              })
              .catch(() => {
                createURL(url);
              });
            return;
          }
        } catch {
          // ignore and fallback below
        }
      }
      // No valid tab or injection not available -> fallback
      createURL(url);
      return;
    }

    // Case 2: URL has no extension -> use chrome.downloads with a suggested filename.mp4
    try {
      const filename = suggestName();
      if (chrome?.downloads?.download) {
        chrome.downloads.download(
          { url, filename, conflictAction: "uniquify", saveAs: false },
          (downloadId) => {
            if (!downloadId || chrome.runtime.lastError) {
              // Fallback to page injection (filename may be ignored cross-origin)
              if (typeof tabId === "number") {
                const scriptingApi = (browser as any)?.scripting || (chrome as any)?.scripting;
                if (scriptingApi && typeof scriptingApi.executeScript === "function") {
                  scriptingApi.executeScript({
                    target: { tabId },
                    world: "MAIN",
                    func: (u: string, name: string) => {
                      try {
                        const a = document.createElement("a");
                        a.href = u;
                        a.target = "_blank";
                        if (name) a.download = name;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      } catch (e) {
                        try { window.open(u, "_blank"); } catch {}
                      }
                    },
                    args: [url, filename],
                  });
                } else {
                  createURL(url);
                }
              } else {
                createURL(url);
              }
            }
          }
        );
        return;
      }
    } catch {
      // ignore and fallback below
    }

    // Fallback: open via extension helper
    createURL(url);
  }

  downloadHLS(videoInfo: any, rollConfig: IRollConfig, favIcon: string) {
    const id = `videoroll_download-${nanoid()}`;
    chrome.storage.session
      .set({
        [id]: JSON.parse(
          JSON.stringify({ ...videoInfo, webUrl: rollConfig.url, favIcon })
        ),
      })
      .then(() => {
        const newUrl = browser.runtime.getURL(
          `download/download.html?downloadId=${id}`
        );
        browser.tabs.create({ url: newUrl });
      });
  }

  downloadDASH() {}
}
