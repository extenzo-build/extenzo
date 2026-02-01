import { ActionType } from "src/types/type.d";
import { sendTabMessage, handleSpecialWebsite } from "src/util";

// 替换为正常的 import 语句
import { Parser } from "m3u8-parser";
import { parse } from "mpd-parser";
import VideoDownloader from "./VideoDownloader";
// 音频编解码器标识符列表
const AUDIO_CODEC_PREFIXES = [
  "mp4a", // AAC
  "ac-3", // AC3
  "ec-3", // Enhanced AC3
  "opus", // Opus
  "vorbis", // Vorbis
];

// 视频编解码器标识符列表
const VIDEO_CODEC_PREFIXES = [
  "avc", // H.264
  "hvc", // H.265/HEVC
  "hev", // 另一种H.265表示
  "av1", // AV1
  "vp8", // VP8
  "vp9", // VP9
];

// 内存管理配置
const MEMORY_CONFIG = {
  // 每个 tab 最大视频数量
  MAX_VIDEOS_PER_TAB: 50,
  MAX_VIDEOS_PRE_PRO_TAB: 100,
  // 总体最大视频数量
  MAX_TOTAL_VIDEOS: 400,
  // requestMap 最大条目数
  MAX_REQUEST_MAP_SIZE: 600,
  // hlsContentMap 最大条目数
  MAX_HLS_CONTENT_MAP_SIZE: 600,
  // 批量更新延迟时间(ms)
  BATCH_UPDATE_DELAY: 1000,
};

export default class VideoDetector {
  videoList: Map<number, any> = new Map<number, any>();
  requestMap: Map<string, any> = new Map<string, any>();
  hlsContentMap: Map<string, any> = new Map<string, any>();
  downloader: any = null;

  // 内存管理相关属性
  private pendingUpdates: Map<number, Set<string>> = new Map();
  private updateTimers: Map<number, NodeJS.Timeout> = new Map();
  private totalVideoCount: number = 0;

  // 监听器引用管理
  private tabsOnRemovedListener: ((tabId: number) => void) | null = null;
  private tabsOnUpdatedListener:
    | ((tabId: number, changeInfo: any, tab: any) => void)
    | null = null;
  unSupportedDomains: any = ["youtube.com"];
  // 优化视频格式检测规则
  videoPatterns: any = {
    MP4: [
      /\.(mp4|m4v)(\?|$)/i,
      /mime_type=video[/_]mp4/i,
      /type=video[/_]mp4/i,
      /content-type=video[/_]mp4/i,
    ],
    webm: [
      /\.(webm)(\?|$)/i,
      /mime_type=video[/_]webm/i,
      /type=video[/_]webm/i,
      /content-type=video[/_]webm/i,
    ],
    HLS: [
      /\.(m3u8)(\?|$)/i,
      /playlist\.m3u8/i,
      /manifest\.m3u8/i,
      /manifest/i,
      /hls_\d+/i,
    ],
    DASH: [
      // 更精确的 MPD/m4s 匹配规则
      /\/manifest\.mpd/i,
      /\/dash\.mpd/i,
      /\/(init|chunk).*\.m4s/i,
      /segment_\d+\.m4s/i,
      /video_\d+\.m4s/i,
      /audio_\d+\.m4s/i,
      /\.(mpd|m4s)(\?|$)/i,
      /manifest\.mpd/i,
      /dash\.mpd/i,
    ],
  };

  onBeforeRequestBindingCallback:
    | ((details: chrome.webRequest.OnBeforeRequestDetails) => void)
    | undefined;

  onSendHeadersBindingCallback:
    | ((details: chrome.webRequest.OnSendHeadersDetails) => void)
    | undefined;

  onResponseStartBindingCallback:
    | ((details: chrome.webRequest.OnResponseStartedDetails) => void)
    | undefined;

  constructor() {
    this.onDownloadListener();
    this.onRemovedListener();
    this.onUpdateListener();
    this.onBeforeRequestListener();
    this.onSendHeadersListener();
    this.onResponseStartListener();
  }

  onDownloadListener() {
    this.downloader = new VideoDownloader();
  }

  onRemovedListener() {
    // 移除旧的监听器（如果存在）
    if (this.tabsOnRemovedListener) {
      chrome.tabs.onRemoved.removeListener(this.tabsOnRemovedListener);
    }

    // 创建新的监听器
    this.tabsOnRemovedListener = (tabId: number) => {
      this.cleanupTabResources(tabId);
    };

    // 添加监听器
    chrome.tabs.onRemoved.addListener(this.tabsOnRemovedListener);
  }

  disable(tabId: number) {
    this.cleanupTabResources(tabId);

    // 安全移除 WebRequest 监听器
    if (this.onBeforeRequestBindingCallback) {
      chrome.webRequest.onBeforeRequest.removeListener(
        this.onBeforeRequestBindingCallback as any
      );
      this.onBeforeRequestBindingCallback = undefined;
    }

    if (this.onResponseStartBindingCallback) {
      chrome.webRequest.onResponseStarted.removeListener(
        this.onResponseStartBindingCallback
      );
      this.onResponseStartBindingCallback = undefined;
    }

    if (this.onSendHeadersBindingCallback) {
      chrome.webRequest.onSendHeaders.removeListener(
        this.onSendHeadersBindingCallback
      );
      this.onSendHeadersBindingCallback = undefined;
    }
  }

  enable(tabId: number) {
    this.disable(tabId);
    this.onBeforeRequestListener();
    this.onResponseStartListener();
    this.onSendHeadersListener();
  }

  onUpdateListener() {
    // 移除旧的监听器（如果存在）
    if (this.tabsOnUpdatedListener) {
      chrome.tabs.onUpdated.removeListener(this.tabsOnUpdatedListener);
    }

    // 创建新的监听器
    this.tabsOnUpdatedListener = (tabId: number, changeInfo: any, tab: any) => {
      if (changeInfo.status === "loading" || changeInfo.url) {
        this.cleanupTabResources(tabId);
      }
    };

    // 添加监听器
    chrome.tabs.onUpdated.addListener(this.tabsOnUpdatedListener);
  }

  onBeforeRequestCallback(details: chrome.webRequest.OnBeforeRequestDetails) {
    const { url, tabId, initiator, requestId, timeStamp, type } = details;
    if (tabId === -1) return;

    if (!["media", "xmlhttprequest"].includes(type)) return;

    if (
      this.unSupportedDomains.some((domain: string) =>
        initiator?.includes(domain)
      )
    )
      return;

    // 1. 首先验证 URL 协议
    if (!this.hasValidProtocol(url)) {
      // console.debug("Invalid URL protocol:", url);
      return;
    }

    // 2. 尝试解析 URL
    try {
      new URL(url);
    } catch {
      // console.debug("Invalid URL format:", url);
      return;
    }

    const newUrl = handleSpecialWebsite({ url: initiator || "", baseUrl: url });

    const videoType = this.detectVideoType(newUrl) || "UNKNOWN";

    const request = this.requestMap.get(requestId);

    if (request) return;

    for (const [key, value] of this.requestMap.entries()) {
      if (value.url === newUrl) return;
    }

    this.requestMap.set(requestId, {
      ...(request ?? {}),
      id: requestId,
      url: newUrl,
      tabId,
      timeStamp,
      type,
      videoType,
      createdAt: Date.now(), // 添加创建时间戳
    });

    // 检查并清理 requestMap 大小
    this.cleanupRequestMapIfNeeded();

    return;
  }

  onBeforeRequestListener() {
    this.onBeforeRequestBindingCallback =
      this.onBeforeRequestCallback.bind(this);
    // 监听网络请求
    chrome.webRequest.onBeforeRequest.addListener(
      this.onBeforeRequestBindingCallback as any,
      { urls: ["<all_urls>"] },
      ["requestBody"]
    );
  }

  onSendHeadersCallback(details: chrome.webRequest.OnBeforeSendHeadersDetails) {
    const {
      requestHeaders,
      url,
      tabId,
      initiator,
      requestId,
      timeStamp,
      type,
    } = details;

    // 检查请求头中的
    const isPlaylist = requestHeaders?.some(
      (h) =>
        h.name.toLowerCase() === "x-extension-playlist-request" &&
        h.value?.toLowerCase() === "video-roll"
    );

    if (tabId === -1 && !isPlaylist) return;

    if (!["media", "xmlhttprequest"].includes(type)) return;

    const newUrl = handleSpecialWebsite({ url: initiator || "", baseUrl: url });

    if (requestHeaders) {
      const request = this.requestMap.get(requestId);
      let currentTabId = tabId;
      if (isPlaylist) {
        const tabVal =
          requestHeaders.find((v: any) => v.name === "X-Extension-Tab-Id")
            ?.value ?? tabId;
        currentTabId =
          typeof tabVal === "string" ? parseInt(tabVal, 10) : tabVal;
      }

      if (request) {
        if (request.url === newUrl && request.requestHeaders) return;

        this.requestMap.set(requestId, {
          ...(request ?? {}),
          id: requestId,
          requestHeaders,
          timeStamp,
          type,
          url: newUrl,
          tabId: currentTabId,
          createdAt: Date.now(), // 添加创建时间戳
        });
      } else if (isPlaylist) {
        this.requestMap.set(requestId, {
          ...(request ?? {}),
          id: requestId,
          requestHeaders,
          timeStamp,
          type,
          url: newUrl,
          tabId: currentTabId,
          createdAt: Date.now(), // 添加创建时间戳
        });
      }

      // 检查并清理 requestMap 大小
      this.cleanupRequestMapIfNeeded();
    }
  }

  onSendHeadersListener() {
    this.onSendHeadersBindingCallback = this.onSendHeadersCallback.bind(this);
    // 监听请求发送前，保存请求头信息
    chrome.webRequest.onSendHeaders.addListener(
      this.onSendHeadersBindingCallback,
      { urls: ["<all_urls>"] },
      ["requestHeaders", "extraHeaders"]
    );
  }

  onResponseStartCallback(details: chrome.webRequest.OnResponseStartedDetails) {
    try {
      const {
        responseHeaders,
        url,
        tabId,
        initiator,
        requestId,
        timeStamp,
        type,
      } = details;

      const request = this.requestMap.get(requestId);

      if (!request) return;

      const isPlaylist = request.requestHeaders?.some(
        (h: any) =>
          h.name.toLowerCase() === "x-extension-playlist-request" &&
          h.value?.toLowerCase() === "video-roll"
      );

      if (tabId === -1 && !isPlaylist) return;

      if (!["media", "xmlhttprequest"].includes(type)) return;

      const newUrl = handleSpecialWebsite({
        url: initiator || "",
        baseUrl: url,
      });
      // if (request.url === url && !request.requestHeaders)

      // 结合请求头和响应头判断是否为视频资源
      if (
        this.isVideoResource(
          request.videoType,
          request.requestHeaders,
          responseHeaders
        )
      ) {
        const videoType = this.detectVideoTypeWithHeaders(
          request.videoType,
          newUrl,
          responseHeaders
        );
        if (videoType) {
          this.requestMap.set(requestId, {
            ...(request ?? {}),
            responseHeaders,
            id: requestId,
            timeStamp,
            type,
            url: newUrl,
            createdAt: request?.createdAt || Date.now(), // 保持原有时间戳或添加新的
          });
          const target = this.requestMap.get(requestId);
          this.handleVideoRequest(target, videoType);
        }
      } else {
        this.requestMap.delete(requestId);
      }
    } catch (error) {
      console.error("Error processing response:", error);
    }
  }

  onResponseStartListener() {
    this.onResponseStartBindingCallback =
      this.onResponseStartCallback.bind(this);
    // 监听响应开始，用于更准确地判断资源类型
    chrome.webRequest.onResponseStarted.addListener(
      this.onResponseStartBindingCallback,
      { urls: ["<all_urls>"] },
      ["responseHeaders"]
    );
  }

  // 检查 URL 协议是否有效
  hasValidProtocol(url: string) {
    // URL 协议验证的正则表达式
    const protocolPattern = /^https?:\/\//i;
    const multipleProtocolPattern = /https?:\/\/.*https?:\/\//i;

    // 检查是否以 http:// 或 https:// 开头
    if (!protocolPattern.test(url)) {
      return false;
    }

    // 检查是否包含多个 http:// 或 https://
    if (multipleProtocolPattern.test(url)) {
      return false;
    }

    return true;
  }

  // 检测视频类型
  detectVideoType(url: string) {
    for (const [type, pattern] of Object.entries(this.videoPatterns)) {
      const arr = pattern as unknown as RegExp[];
      if (arr.some((rule: RegExp) => rule.test(url))) return type;
    }
    return null;
  }

  isVideoResource(url: string, requestHeaders: any, responseHeaders: any) {
    // 检查响应头中的 Content-Type
    const contentType = responseHeaders
      ?.find((h: any) => h.name.toLowerCase() === "content-type")
      ?.value?.toLowerCase();

    // 视频相关的MIME类型列表
    const videoMimeTypes = [
      // 视频格式
      "video/", // 所有视频类型
      "application/mp4", // MP4
      "application/octet-stream", // 二进制流，可能是视频
      "binary/octet-stream", // 某些站点使用的非标准类型（如网盘）
      // 流媒体格式
      "application/m4s",
      "application/octet-stream-m3u8",
      "application/vnd.yt-ump",
      "application/dash+xml", // DASH
      "application/vnd.apple.mpegurl", // HLS
      "application/x-mpegurl", // HLS 替代
      "application/mpegurl", // HLS 替代
      "audio/mpegurl", // HLS 音频
      "audio/x-mpegurl", // HLS 音频替代
      "video/mp2t", // MPEG-TS
      // 音频格式（有些视频可能被标记为音频）
      "audio/mp4", // MP4 音频
      "audio/mpeg", // MP3
      "audio/aac", // AAC
      // 片段格式
      "video/iso.segment", // DASH 片段
      "audio/iso.segment", // DASH 音频片段
    ];

    // 通过Content-Type检测
    if (contentType) {
      if (videoMimeTypes.some((mimeType) => contentType.includes(mimeType))) {
        return true;
      }
    }

    // 检查响应头中的 Content-Disposition
    const contentDisposition =
      responseHeaders
        ?.find((h: any) => h.name.toLowerCase() === "content-disposition")
        ?.value?.toLowerCase() ?? "";

    if (contentDisposition) {
      // 检查是否包含视频文件名
      if (contentDisposition.includes("filename=")) {
        const videoExtensions = [
          ".mp4",
          ".m4v",
          ".webm",
          ".mkv",
          ".flv",
          ".mov",
          ".m3u8",
          ".mpd",
          ".m4s",
          ".ts",
        ];
        if (videoExtensions.some((ext) => contentDisposition.includes(ext))) {
          return true;
        }
      }
    }

    // 检查请求头中的 Range 和 Accept
    const hasRange = requestHeaders?.some(
      (h: any) => h.name.toLowerCase() === "range"
    );
    const acceptHeader = requestHeaders
      ?.find((h: any) => h.name.toLowerCase() === "accept")
      ?.value?.toLowerCase();

    // 增强 Range 请求检测
    if (hasRange) {
      // 如果有 Range 头，并且 Accept 头包含视频类型或通配符
      if (
        acceptHeader &&
        (acceptHeader.includes("video/") ||
          acceptHeader.includes("audio/") ||
          acceptHeader.includes("*/*"))
      ) {
        // 如果 URL 也匹配视频格式，则更有可能是视频资源
        // if (urlVideoType) {
        //     return true;
        // }

        // 检查响应大小，大文件更可能是视频
        const contentLength = responseHeaders?.find(
          (h: any) => h.name.toLowerCase() === "content-length"
        )?.value;

        if (contentLength) {
          // 大于1MB
          return true;
        }
      }
    }

    // 检查请求头中的 Referer，某些视频请求可能来自视频播放页面
    // const referer = requestHeaders?.find(h =>
    //     h.name.toLowerCase() === 'referer'
    // )?.value.toLowerCase();

    // if (referer &&
    //     (referer.includes('/video/') ||
    //      referer.includes('/play/') ||
    //      referer.includes('/watch') ||
    //      referer.includes('/movie/') ||
    //      referer.includes('/episode/'))) {
    //     // 如果 URL 也匹配视频格式，则更有可能是视频资源
    //     if (urlVideoType) {
    //         return true;
    //     }
    // }

    // 检查URL路径是否包含视频相关关键词
    // const videoPathKeywords = ['/video/', '/media/', '/stream/', '/play/', '/watch/', '/movie/', '/episode/', '/hls/', '/dash/'];
    // if (videoPathKeywords.some(keyword => url.includes(keyword))) {
    //     return true;
    // }

    // 检查响应头中的其他特征
    const acceptRanges = responseHeaders
      ?.find((h: any) => h.name.toLowerCase() === "accept-ranges")
      ?.value?.toLowerCase();

    if (acceptRanges === "bytes") {
      // 支持范围请求且URL匹配视频格式，可能是视频
      return true;
    }

    return false;
  }

  // 使用响应头增强视频类型检测
  detectVideoTypeWithHeaders(
    videoType: string,
    url: string,
    responseHeaders?: chrome.webRequest.HttpHeader[]
  ): string | null {
    const contentType =
      responseHeaders
        ?.find((h: any) => h.name.toLowerCase() === "content-type")
        ?.value?.toLowerCase() || "";

    if (contentType) {
      // Generic binary stream often used for direct video bytes
      if (/(^|\s|;)([\w-]+\/)?octet-stream(\s|;|$)/.test(contentType)) {
        // If URL already hints a video file, classify as MP4
        const hasVideoExt = [
          ".mp4",
          ".m4v",
          ".mov",
          ".webm",
          ".mkv",
          ".flv",
          ".ts",
        ].some((ext) => url.toLowerCase().includes(ext));

        if (hasVideoExt) return "MP4";

        // Otherwise, infer by headers typical of byte-range video delivery
        const acceptRanges = responseHeaders
          ?.find((h) => h.name.toLowerCase() === "accept-ranges")
          ?.value?.toLowerCase();
        const contentRange = responseHeaders?.find(
          (h) => h.name.toLowerCase() === "content-range"
        )?.value;
        const contentLengthStr = responseHeaders?.find(
          (h) => h.name.toLowerCase() === "content-length"
        )?.value;
        const contentLength = contentLengthStr
          ? parseInt(contentLengthStr, 10)
          : 0;

        // Heuristics: range support or sizable payload indicates a full video file
        if (
          acceptRanges === "bytes" ||
          !!contentRange ||
          contentLength >= 1024 * 1024 // >= 1MB
        ) {
          return "MP4";
        }
        // Fall through to other checks if not conclusive
      }

      // MP4 格式检测
      if (
        contentType.includes("video/mp4") ||
        contentType.includes("application/mp4") ||
        contentType.includes("video/mpeg4") ||
        contentType.includes("video/quicktime") ||
        contentType.includes("video/x-msvideo") ||
        contentType.includes("video/x-matroska")
      ) {
        return "MP4";
      }

      // 音频格式检测 (有些视频可能被标记为音频)
      if (
        (contentType.includes("audio/mp4") ||
          contentType.includes("audio/mpeg")) &&
        (url.includes(".mp4") || url.includes(".m4a"))
      ) {
        return "MP4";
      }

      // HLS 格式检测
      if (
        contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("application/x-mpegurl") ||
        contentType.includes("application/mpegurl") ||
        contentType.includes("audio/mpegurl") ||
        contentType.includes("audio/x-mpegurl") ||
        contentType.includes("application/vnd.apple.mpegurl.audio")
      ) {
        return "HLS";
      }

      // DASH 格式检测
      if (contentType.includes("application/dash+xml")) {
        return "DASH";
      }

      // M4S 片段检测
      if (
        contentType.includes("video/iso.segment") ||
        contentType.includes("audio/iso.segment") ||
        (/(^|\s|;)([\w-]+\/)?octet-stream(\s|;|$)/.test(contentType) &&
          url.includes(".m4s"))
      ) {
        return "DASH"; // M4S 通常是 DASH 的一部分
      }

      // WebM 格式检测
      if (
        contentType.includes("video/webm") ||
        contentType.includes("audio/webm")
      ) {
        return "WebM"; // 处理为通用视频
      }

      // 通用二进制流检测 - 可能是视频
      if (/(^|\s|;)([\w-]+\/)?octet-stream(\s|;|$)/.test(contentType)) {
        // 检查URL是否包含视频扩展名
        const videoExtensions = [
          ".mp4",
          ".m4v",
          ".webm",
          ".mkv",
          ".flv",
          ".mov",
          ".ts",
        ];
        if (videoExtensions.some((ext) => url.toLowerCase().includes(ext))) {
          return "MP4";
        }
      }
    }

    // 检查 Content-Disposition 头
    const contentDisposition = responseHeaders
      ?.find((h: any) => h.name.toLowerCase() === "content-disposition")
      ?.value?.toLowerCase();

    if (contentDisposition) {
      // 更全面的文件扩展名检测
      if (
        contentDisposition.includes(".mp4") ||
        contentDisposition.includes(".m4v") ||
        contentDisposition.includes(".mov") ||
        contentDisposition.includes(".webm") ||
        contentDisposition.includes(".mkv") ||
        contentDisposition.includes(".flv")
      ) {
        return "MP4";
      }
      if (contentDisposition.includes(".webm")) {
        return "WebM";
      }
      if (contentDisposition.includes(".m3u8")) return "HLS";
      if (contentDisposition.includes(".mpd")) return "DASH";
      if (contentDisposition.includes(".m4s")) return "DASH";
      if (contentDisposition.includes(".ts")) return "HLS"; // TS 片段通常是 HLS 的一部分
    }

    // 检查URL路径特征
    if (url.includes("/hls/") || url.includes("/m3u8/")) {
      return "HLS";
    }
    if (url.includes("/dash/") || url.includes("/mpd/")) {
      return "DASH";
    }

    // 如果无法从响应头判断，则使用 URL 判断
    return videoType;
  }

  // 处理视频请求
  handleVideoRequest(request: any, videoType: string) {
    const { url, tabId, id, requestHeaders, responseHeaders } = request;

    // 提取内容长度信息
    const contentLengthHeader = responseHeaders?.find(
      (header: chrome.webRequest.HttpHeader) =>
        header.name.toLowerCase() === "content-length"
    );

    let size = contentLengthHeader
      ? parseInt(contentLengthHeader.value, 10)
      : 0;

    const contentRangeHeader = responseHeaders?.find(
      (header: chrome.webRequest.HttpHeader) =>
        header.name.toLowerCase() === "content-range"
    );

    const contentRange = contentRangeHeader?.value.split("/")[1];

    if (contentRange && contentRange !== "*") {
      size = parseInt(contentRange);
    }

    // 提取内容类型信息
    const contentTypeHeader = responseHeaders?.find(
      (header: chrome.webRequest.HttpHeader) =>
        header.name.toLowerCase() === "content-type"
    );
    const contentType = contentTypeHeader ? contentTypeHeader.value : "";

    // 从URL中提取文件名作为标题
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split("/");
    let fileName = pathSegments[pathSegments.length - 1];
    // 移除查询参数
    fileName = fileName.split("?")[0];

    // 格式化文件大小
    let fileSize = "";
    if (size > 0) {
      if (size < 1024) {
        fileSize = size + " B";
      } else if (size < 1024 * 1024) {
        fileSize = (size / 1024).toFixed(2) + " KB";
      } else if (size < 1024 * 1024 * 1024) {
        fileSize = (size / (1024 * 1024)).toFixed(2) + " MB";
      } else {
        fileSize = (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
      }
    }

    // 基本视频信息
    const baseVideoInfo = {
      id,
      url: url,
      title: fileName,
      type: videoType,
      size: fileSize,
      sizeNumebr: size,
      tabId,
      // contentLength: size,
      contentType: contentType,
      timestamp: Date.now(),
      requestHeaders: requestHeaders, // 保存请求头信息，用于后续下载
      responseHeaders: responseHeaders, // 保存响应头信息，用于后续分析
    };

    switch (videoType) {
      case "MP4":
        this.addVideoToList(tabId, {
          ...baseVideoInfo,
          duration: null, // 视频时长需要在content.js中获取
        });
        break;
      case "HLS":
        this.handleHLS(baseVideoInfo);
        break;
      case "DASH":
        // this.handleDASH(baseVideoInfo);
        break;
      default:
        break;
    }
  }

  // 处理M3U8视频
  async handleHLS(baseVideoInfo: any = null) {
    try {
      const { id, tabId, url, requestHeaders, contentType } = baseVideoInfo;

      if (this.videoList.has(tabId) && this.videoList.get(tabId).has(id))
        return;

      // 转换请求头格式
      const headers =
        requestHeaders?.reduce((acc: Record<string, string>, header: any) => {
          acc[String(header.name)] = String(header.value);
          return acc;
        }, {} as Record<string, string>) || {};

      const isPlaylist = headers["X-Extension-Playlist-Request"];

      if (isPlaylist) {
        const content = this.hlsContentMap.get(id);
        this.handleHLSContent(content, baseVideoInfo);
        this.hlsContentMap.delete(id);
        return;
      }

      await this.updateHeaderRules(headers, tabId);
      const response = await fetch(url);
      const content = await response.text();
      this.handleHLSContent(content, baseVideoInfo);
    } catch (error) {
      console.error("M3U8 fetch error:", error);
    }
  }

  async handleHLSContent(content: any, baseVideoInfo: any) {
    const { id, tabId, url, contentType } = baseVideoInfo;

    const parser = new Parser();
    parser.push(content);
    parser.end();

    const manifest = parser.manifest;

    if (!manifest.segments?.length && contentType === "video/mp2t") {
      this.requestMap.delete(id);
      return;
    }

    // 初始化结果对象
    const result: any = {
      hasAudio: false,
      hasVideo: false,
      mediaType: "", // 'audio-only', 'video-only', 'audio-video', 'unknown'
      codecs: [],
      details: {},
    };

    // 提取视频时长信息
    let duration = 0;
    if (manifest.segments && manifest.segments.length > 0) {
      duration = manifest.segments.reduce(
        (total, segment) => total + (segment.duration || 0),
        0
      );
    }

    // 提取视频质量信息
    let qualities: any[] = [];

    if ((manifest as any).playlists && (manifest as any).playlists.length > 0) {
      qualities = (manifest as any).playlists.map((playlist: any) => ({
        bandwidth: playlist.attributes?.BANDWIDTH,
        resolution: playlist.attributes?.RESOLUTION,
        uri: new URL(playlist.uri, url).href,
        codecs: playlist.attributes?.CODECS,
      }));

      (manifest as any).playlists.forEach((playlist: any) => {
        // 分析CODECS属性
        if (playlist.attributes?.CODECS) {
          const codecs = String(playlist.attributes.CODECS)
            .split(",")
            .map((codec: string) => codec.trim());
          // 使用Set去重，合并编解码器列表
          result.codecs = [...new Set([...result.codecs, ...codecs])];

          // 使用常量数组检查是否包含音频编解码器
          const hasAudioCodec = codecs.some((codec: string) =>
            AUDIO_CODEC_PREFIXES.some((prefix) => codec.startsWith(prefix))
          );

          // 使用常量数组检查是否包含视频编解码器
          const hasVideoCodec = codecs.some((codec: string) =>
            VIDEO_CODEC_PREFIXES.some((prefix) => codec.startsWith(prefix))
          );

          if (hasAudioCodec) result.hasAudio = true;
          if (hasVideoCodec) result.hasVideo = true;
        }
      });
    } else if (
      (manifest as any).mediaGroups &&
      (manifest as any).mediaGroups.AUDIO
    ) {
      // 检查是否有专门的音频组
      result.hasAudio = true;
      result.details.audioGroups = [];

      // 遍历所有音频组
      Object.keys((manifest as any).mediaGroups.AUDIO).forEach(
        (groupId: string) => {
          const group: any = (manifest as any).mediaGroups.AUDIO[groupId];
          Object.keys(group).forEach((audioName: string) => {
            const audio: any = group[audioName];
            result.details.audioGroups.push({
              groupId,
              name: audioName,
              language: audio.language,
              uri: audio.uri,
              default: audio.default,
              autoselect: audio.autoselect,
              codecs: audio.attributes?.CODECS,
            });

            if (audio.attributes?.CODECS) {
              result.codecs.push(String(audio.attributes.CODECS));
            }
          });
        }
      );
    }

    // 如果没有找到播放列表，检查segments
    if (
      content &&
      (!manifest.playlists || manifest.playlists.length === 0) &&
      manifest.segments
    ) {
      result.details.segmentCount = manifest.segments.length;

      // 检查segments中是否有EXT-X-MEDIA标签
      const mediaTag = content.match(/#EXT-X-MEDIA:TYPE=([^,]+),/i);
      if (mediaTag) {
        const mediaType = mediaTag[1].toLowerCase();
        if (mediaType === "audio") {
          result.hasAudio = true;
        } else if (mediaType === "video") {
          result.hasVideo = true;
        }
      }

      // 检查是否有CODECS信息
      const codecsMatch = content.match(
        /#EXT-X-STREAM-INF:.*CODECS="([^"]+)"/i
      );
      if (codecsMatch) {
        const codecs = codecsMatch[1]
          .split(",")
          .map((codec: string) => codec.trim());
        result.codecs = codecs;

        // 使用常量数组检查是否包含音频编解码器
        const hasAudioCodec = codecs.some((codec: string) =>
          AUDIO_CODEC_PREFIXES.some((prefix) => codec.startsWith(prefix))
        );

        // 使用常量数组检查是否包含视频编解码器
        const hasVideoCodec = codecs.some((codec: string) =>
          VIDEO_CODEC_PREFIXES.some((prefix) => codec.startsWith(prefix))
        );

        if (hasAudioCodec) result.hasAudio = true;
        if (hasVideoCodec) result.hasVideo = true;
      }
    }

    // 确定最终的媒体类型
    if (result.hasAudio && result.hasVideo) {
      result.mediaType = "audio-video";
    } else if (result.hasAudio) {
      result.mediaType = "audio-only";
    } else if (result.hasVideo) {
      result.mediaType = "video-only";
    }

    const width = baseVideoInfo.requestHeaders.find(
      (v: any) => v.name === "X-Extension-Video-Width"
    )?.value;
    const height = baseVideoInfo.requestHeaders.find(
      (v: any) => v.name === "X-Extension-Video-Height"
    )?.value;
    const kbps = baseVideoInfo.requestHeaders.find(
      (v: any) => v.name === "X-Extension-Video-Kbps"
    )?.value;

    // 转换请求头格式
    const headers =
      baseVideoInfo.requestHeaders?.reduce(
        (acc: Record<string, string>, header: any) => {
          acc[String(header.name)] = String(header.value);
          return acc;
        },
        {} as Record<string, string>
      ) || {};
    // 使用baseVideoInfo中的信息（如果有）
    const videoInfo = {
      ...(baseVideoInfo || {}),
      type: "HLS",
      url: url,
      quality: qualities.length || 1,
      qualities,
      segments: manifest.segments,
      width,
      height,
      kbps,
      duration: this.formatDuration(duration),
      timestamp: Date.now(),
      headers,
      mediaType: result.mediaType,
      title: baseVideoInfo?.title || this.extractVideoTitle(url),
    };

    this.addVideoToList(Number(tabId), videoInfo);

    if (qualities.length) {
      for (const item of qualities) {
        const response = await fetch(item.uri, {
          headers: {
            "X-Extension-Playlist-Request": "video-roll",
            "X-Extension-Video-Width": String(item?.resolution?.width ?? ""),
            "X-Extension-Video-Height": String(item?.resolution?.height ?? ""),
            "X-Extension-Video-Kbps": String(
              Math.floor((item?.bandwidth ?? 0) / 1000)
            ),
            "X-Extension-Tab-Id": String(tabId),
          } as Record<string, string>,
        });
        const content = await response.text();

        let request;
        for (const [key, value] of this.requestMap.entries()) {
          if (value.url === item.uri) {
            request = value;
            break;
          }
        }

        if (request) {
          this.hlsContentMap.set(request.id, content);
          // 检查并清理 hlsContentMap 大小
          this.cleanupHlsContentMapIfNeeded();
          this.handleVideoRequest(request, "HLS");
        }

        // this.handleHLSContent(content, );
      }
    }
  }

  async handleDASH(baseVideoInfo: any = null) {
    try {
      const { id, tabId, url, requestHeaders } = baseVideoInfo;

      if (this.videoList.has(tabId) && this.videoList.get(tabId).has(id))
        return;

      // 转换请求头格式
      const headers =
        requestHeaders?.reduce((acc: Record<string, string>, header: any) => {
          acc[String(header.name)] = String(header.value);
          return acc;
        }, {} as Record<string, string>) || {};

      await this.updateHeaderRules(headers, tabId);
      const response = await fetch(url);

      if (!response.ok) return;

      const content = await response.text();

      const manifest = parse(content, { url });

      // 提取视频时长信息
      let duration = 0;
      if (manifest.duration) {
        duration = manifest.duration;
      }

      // 提取视频质量信息
      let qualities: any[] = [];
      if (
        (manifest as any).playlists &&
        (manifest as any).playlists.length > 0
      ) {
        qualities = (manifest as any).playlists.map((playlist: any) => ({
          bandwidth: playlist.attributes?.bandwidth,
          resolution: playlist.attributes?.resolution,
          uri: playlist.uri,
        }));
      }

      // 使用baseVideoInfo中的信息（如果有）
      const videoInfo = {
        ...(baseVideoInfo || {}),
        type: "DASH",
        url: url,
        quality: qualities.length || 1,
        qualities: qualities,
        duration: this.formatDuration(duration),
        timestamp: Date.now(),
        headers: headers,
        title: baseVideoInfo?.title || this.extractVideoTitle(url),
      };

      this.addVideoToList(tabId, videoInfo);
    } catch (error) {
      console.error("MPD fetch error:", error);
    }
  }

  addVideoToList(tabId: number, videoInfo: any) {
    this.addVideoToListOptimized(tabId, videoInfo);
  }

  // 从URL中提取视频标题
  extractVideoTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      // 尝试从路径中提取文件名
      const pathParts = urlObj.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];

      // 如果有文件名部分，尝试提取名称（去除扩展名和查询参数）
      if (lastPart && lastPart.length > 0) {
        // 移除扩展名
        const nameWithoutExt = lastPart.replace(/\.(mp4|m3u8|mpd|m4s)$/i, "");
        // 移除常见的ID和哈希部分
        const cleanName = nameWithoutExt.replace(/[_-]\w{6,}$/i, "");
        // 替换下划线和连字符为空格
        return cleanName.replace(/[_-]/g, " ").trim() || `video_${Date.now()}`;
      }

      // 如果无法从路径提取，尝试从域名提取
      return `video_from_${urlObj.hostname.replace(
        /^www\./,
        ""
      )}_${Date.now()}`;
    } catch (e) {
      // 如果解析失败，返回默认名称
      return `video_${Date.now()}`;
    }
  }

  // 格式化时长为可读字符串
  formatDuration(seconds: number) {
    if (!seconds || isNaN(seconds)) return null;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  }

  // 通知popup更新
  notifyPopup(tabId: any) {
    sendTabMessage(tabId, {
      type: ActionType.GET_DOWNLOAD_LIST,
      downloadList: Array.from(this.videoList.get(tabId).values()),
    });

    // chrome.runtime.sendMessage({
    //     type: "VIDEO_UPDATED",
    //     tabId: tabId,
    //     videos: Array.from(videoStore.get(tabId).values()),
    // });
  }

  async updateHeaderRules(data: any, tabId: any) {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [1],
    });
    const rules = { removeRuleIds: [1], addRules: [] };
    if (Object.keys(data).length) {
      rules.addRules = [
        {
          id: 1,
          priority: 1,
          action: {
            type: "modifyHeaders",
            requestHeaders: Object.keys(data).map((key) => ({
              header: key,
              operation: "set",
              value: data[key],
            })),
          },
          condition: {
            resourceTypes: ["xmlhttprequest", "media"],
            tabIds: [tabId],
          },
        } as never,
      ];
    }
    return chrome.declarativeNetRequest.updateSessionRules(rules);
  }

  // 内存管理和优化方法

  /**
   * 清理 requestMap 如果超过大小限制
   */
  private cleanupRequestMapIfNeeded() {
    if (this.requestMap.size > MEMORY_CONFIG.MAX_REQUEST_MAP_SIZE) {
      // 按照创建时间排序，删除最老的条目
      const entries = Array.from(this.requestMap.entries()) as [string, any][];
      entries.sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));

      const deleteCount =
        this.requestMap.size - MEMORY_CONFIG.MAX_REQUEST_MAP_SIZE;
      for (let i = 0; i < deleteCount; i++) {
        this.requestMap.delete(entries[i][0]);
      }
    }
  }

  /**
   * 清理 hlsContentMap 如果超过大小限制
   */
  private cleanupHlsContentMapIfNeeded() {
    if (this.hlsContentMap.size > MEMORY_CONFIG.MAX_HLS_CONTENT_MAP_SIZE) {
      // 获取条目并删除最老的（假设键是按时间顺序的）
      const entries = Array.from(this.hlsContentMap.entries());
      const deleteCount =
        this.hlsContentMap.size - MEMORY_CONFIG.MAX_HLS_CONTENT_MAP_SIZE;

      for (let i = 0; i < deleteCount; i++) {
        this.hlsContentMap.delete(entries[i][0]);
      }
    }
  }

  /**
   * 清理全局视频数量如果超过限制
   */
  private cleanupGlobalVideosIfNeeded() {
    // 统计当前总视频数量
    let totalCount = 0;
    const allVideos: Array<{
      tabId: number;
      videoId: string;
      timestamp: number;
    }> = [];

    for (const [tabId, tabVideos] of this.videoList.entries()) {
      for (const [videoId, video] of tabVideos.entries()) {
        totalCount++;
        allVideos.push({
          tabId,
          videoId,
          timestamp: video.timestamp || 0,
        });
      }
    }

    // 如果超过限制，按时间戳排序并删除最老的
    if (totalCount > MEMORY_CONFIG.MAX_TOTAL_VIDEOS) {
      allVideos.sort((a, b) => a.timestamp - b.timestamp);

      const deleteCount = totalCount - MEMORY_CONFIG.MAX_TOTAL_VIDEOS;
      for (let i = 0; i < deleteCount; i++) {
        const { tabId, videoId } = allVideos[i];
        const tabVideos = this.videoList.get(tabId);
        if (tabVideos) {
          tabVideos.delete(videoId);
          // 如果 tab 没有视频了，删除整个 tab
          if (tabVideos.size === 0) {
            this.videoList.delete(tabId);
          }
        }
      }
    }

    this.totalVideoCount =
      totalCount - Math.max(0, totalCount - MEMORY_CONFIG.MAX_TOTAL_VIDEOS);
  }

  /**
   * 批量更新通知机制
   */
  private scheduleBatchUpdate(tabId: number, videoId: string) {
    // 添加到待更新列表
    if (!this.pendingUpdates.has(tabId)) {
      this.pendingUpdates.set(tabId, new Set());
    }
    this.pendingUpdates.get(tabId)!.add(videoId);

    // 清除之前的定时器
    if (this.updateTimers.has(tabId)) {
      clearTimeout(this.updateTimers.get(tabId)!);
    }

    // 设置新的定时器
    const timer = setTimeout(() => {
      this.flushBatchUpdate(tabId);
    }, MEMORY_CONFIG.BATCH_UPDATE_DELAY);

    this.updateTimers.set(tabId, timer);
  }

  /**
   * 执行批量更新
   */
  private flushBatchUpdate(tabId: number) {
    const pendingIds = this.pendingUpdates.get(tabId);
    if (!pendingIds || pendingIds.size === 0) return;

    // 获取该 tab 的所有视频
    const tabVideos = this.videoList.get(tabId);
    if (!tabVideos) return;

    const videos = Array.from(tabVideos.values());

    // 发送批量更新通知
    sendTabMessage(tabId, {
      type: ActionType.GET_DOWNLOAD_LIST,
      downloadList: videos,
    });

    // 清理
    this.pendingUpdates.delete(tabId);
    this.updateTimers.delete(tabId);
  }

  /**
   * 检查视频是否重复
   */
  private isDuplicateVideo(tabId: number, url: string, type: string): boolean {
    const tabVideos = this.videoList.get(tabId);
    if (!tabVideos) return false;

    for (const video of tabVideos.values()) {
      if (video.url === url && video.type === type) {
        return true;
      }
    }
    return false;
  }

  /**
   * 优化的添加视频方法
   */
  private addVideoToListOptimized(tabId: number, videoInfo: any) {
    // 检查重复
    if (this.isDuplicateVideo(tabId, videoInfo.url, videoInfo.type)) {
      return;
    }

    // 确保视频信息有时间戳
    videoInfo.timestamp = videoInfo.timestamp || Date.now();

    // 检查单个 tab 的视频数量限制
    if (!this.videoList.has(tabId)) {
      this.videoList.set(tabId, new Map());
    }

    const tabVideos = this.videoList.get(tabId)!;

    // 如果超出 tab 限制，删除最老的视频（插入一条新的，删除一条老的）
    if (tabVideos.size >= MEMORY_CONFIG.MAX_VIDEOS_PER_TAB) {
      const entries = Array.from(tabVideos.entries()) as [string, any][];
      const oldestEntry = entries.sort(
        (a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0)
      )[0];

      tabVideos.delete(oldestEntry[0]);
    }

    // 添加新视频
    tabVideos.set(videoInfo.id, videoInfo);
    this.totalVideoCount++;

    // 检查全局视频数量限制
    this.cleanupGlobalVideosIfNeeded();

    // 使用批量更新
    this.scheduleBatchUpdate(tabId, videoInfo.id);
  }

  /**
   * 清理指定 tab 的资源
   */
  private cleanupTabResources(tabId: number) {
    // 清理视频列表
    const tabVideos = this.videoList.get(tabId);
    if (tabVideos) {
      this.totalVideoCount -= tabVideos.size;
      this.videoList.delete(tabId);
    }

    // 清理请求映射
    for (const [key, value] of this.requestMap.entries()) {
      if (value.tabId === tabId) {
        this.requestMap.delete(key);
      }
    }

    // 清理待更新列表和定时器
    if (this.updateTimers.has(tabId)) {
      clearTimeout(this.updateTimers.get(tabId)!);
      this.updateTimers.delete(tabId);
    }
    this.pendingUpdates.delete(tabId);
  }

  /**
   * 销毁检测器，清理所有资源
   */
  destroy() {
    // 清理所有更新定时器
    for (const timer of this.updateTimers.values()) {
      clearTimeout(timer);
    }
    this.updateTimers.clear();

    // 移除 tabs 监听器
    if (this.tabsOnRemovedListener) {
      chrome.tabs.onRemoved.removeListener(this.tabsOnRemovedListener);
      this.tabsOnRemovedListener = null;
    }

    if (this.tabsOnUpdatedListener) {
      chrome.tabs.onUpdated.removeListener(this.tabsOnUpdatedListener);
      this.tabsOnUpdatedListener = null;
    }

    // 移除 WebRequest 监听器
    if (this.onBeforeRequestBindingCallback) {
      chrome.webRequest.onBeforeRequest.removeListener(
        this.onBeforeRequestBindingCallback as any
      );
      this.onBeforeRequestBindingCallback = undefined;
    }

    if (this.onResponseStartBindingCallback) {
      chrome.webRequest.onResponseStarted.removeListener(
        this.onResponseStartBindingCallback
      );
      this.onResponseStartBindingCallback = undefined;
    }

    if (this.onSendHeadersBindingCallback) {
      chrome.webRequest.onSendHeaders.removeListener(
        this.onSendHeadersBindingCallback
      );
      this.onSendHeadersBindingCallback = undefined;
    }

    // 清理下载器
    if (this.downloader && typeof this.downloader.remove === "function") {
      this.downloader.remove();
      this.downloader = null;
    }

    // 清理所有数据
    this.videoList.clear();
    this.requestMap.clear();
    this.hlsContentMap.clear();
    this.pendingUpdates.clear();
    this.totalVideoCount = 0;
  }
}
