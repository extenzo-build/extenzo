interface CachedSubtitleData {
  url: string;
  timestamp: number;
  initiator?: string;
}

/**
 * Background script for YouTube AI Summarizer
 * Handles communication between content script and Chrome's AI
 */
export class VideoSummarizer {
  private subtitleCache: Map<string, CachedSubtitleData>;
  // 监听器引用管理
  private webRequestListener: ((details: chrome.webRequest.OnBeforeRequestDetails) => void) | null = null;

  constructor() {
    this.subtitleCache = new Map();
    this.initialize();
  }

  private initialize(): void {
    // Initialize on install
    this.setupWebRequestListener();
    this.setupSidePanel();

    // Listen for messages from content script
    // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    //   return this.handleMessage(message, sender, sendResponse);
    // });
  }

  private setupSidePanel(): void {
    if (chrome.sidePanel) {
      try {
        chrome.sidePanel.setOptions(
          {
            enabled: true,
            path: "sidepanel/index.html",
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error("Side Panel 设置失败:", chrome.runtime.lastError);
            } else {
              console.log("Side Panel 已启用");
            }
          }
        );
      } catch (error) {
        console.error("Side Panel 设置失败:", error);
      }
    } else {
      console.warn("该浏览器不支持 Side Panel API");
    }
  }

  private isValidSubtitleUrl(url: string): boolean {
    if (!url) {
      console.debug("URL is empty, invalid");
      return false;
    }

    if (!url.includes("/timedtext")) {
      console.debug("URL does not contain /timedtext path, invalid:", url);
      return false;
    }

    if (!url.includes("fmt=json3")) {
      console.debug("URL does not contain fmt=json3 parameter, invalid:", url);
      return false;
    }

    return true;
  }

  private setupWebRequestListener(): void {
    // 移除旧的监听器（如果存在）
    if (this.webRequestListener) {
      chrome.webRequest.onBeforeRequest.removeListener(this.webRequestListener as any);
    }
    
    // 创建新的监听器
    this.webRequestListener = (details) => this.handleWebRequest(details);
    
    // 添加监听器
    chrome.webRequest.onBeforeRequest.addListener(
      this.webRequestListener as any,
      {
        urls: [
          "*://*.youtube.com/api/timedtext*",
          "*://*.youtube.com/timedtext*",
          "*://www.youtube.com/api/timedtext*",
        ],
        types: ["xmlhttprequest"],
      }
    );
  }

  private handleWebRequest(details: chrome.webRequest.OnBeforeRequestDetails): void {
    if (details.method === "GET" && this.isValidSubtitleUrl(details.url)) {
      const videoIdMatch =
        details.url.match(/v=([^&]+)/) ||
        details.initiator?.match(/youtube\.com\/watch\?v=([^&]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : "unknown";

      this.subtitleCache.set(videoId, {
        url: details.url,
        timestamp: Date.now(),
        initiator: details.initiator,
      });
    }
  }

  /**
   * 移除所有监听器，清理资源
   */
  remove(): void {
    // 移除 WebRequest 监听器
    if (this.webRequestListener) {
      chrome.webRequest.onBeforeRequest.removeListener(this.webRequestListener as any);
      this.webRequestListener = null;
    }
    
    // 清理字幕缓存
    this.subtitleCache.clear();
  }

  public getSubtitleUrl(videoId: string) {
    const cachedData = this.subtitleCache.get(videoId);

    if (cachedData && this.isValidSubtitleUrl(cachedData.url)) {
      console.debug(`Providing cached subtitle URL for video ${cachedData.url}`);
      return cachedData.url;
    }

    return '';
  }
}
