import * as m3u8Parser from "m3u8-parser";
import * as aesDecrypter from "aes-decrypter";
import { Input, Output, Conversion, Mp4OutputFormat, BufferTarget, BlobSource, ALL_FORMATS } from "mediabunny";

// 添加 mux.js 类型声明
declare global {
  interface Window {
    muxjs?: {
      Transmuxer: new (options?: any) => {
        on: (event: string, callback: (segment: any) => void) => void;
        push: (data: Uint8Array) => void;
        flush: () => void;
      };
    };
  }
}

export interface M3U8DownloaderOptions {
  // m3u8地址
  url?: string;
  // 所有分片全部下载成功后自动下载（默认true）
  autoDownload?: boolean;
  // 下载时的文件名称
  filename?: string;
  // 失败重试次数
  retryNum?: number;
  // 排除流，字符串或正则 数组
  excludes?: (string | RegExp)[];
  // 输出MP4格式（默认true）
  outputMp4?: boolean;
  // 输出格式（支持 mp4, webm, avi 等，需要 mediabunny 支持）
  outputFormat?: 'mp4' | 'webm' | 'avi' | 'mov' | 'mkv' | 'ts';
  // 音画同步模式（strict: 严格模式，compatible: 兼容模式，fast: 快速模式）
  syncMode?: 'strict' | 'compatible' | 'fast';
  // 最大请求并行数
  maxParallelNum?: number;
  // 打印日志
  log?: boolean;
  // 视频信息
  videoInfo?: any;
  // 解析完成回调
  onParsed?: (segments: TSegmentType[]) => void;
  // 数据更新回调
  onUpdated?: (
    item: TSegmentType,
    index: number,
    segments: TSegmentType[]
  ) => void;
  // 下载完成回调
  onDownloaded?: (blob: Blob) => void;
  onFinish?: () => void;
  onProgress?: (progress: {
    type: "start" | "end" | "error";
    data: number;
    currentIndex: number;
    totalSegments: number;
    fileSize: number;
    url: string;
    error?: string; // 添加可选的错误信息字段
  }) => void;
}

export type TSegmentStatusType = "waiting" | "pending" | "success" | "error";

export type TSegmentKeyType = {
  method: string;
  uri: string;
  iv: string;
};

export type TSegmentType = {
  uri: string;
  duration: number;
  title: string;
  timeline: number;
  key?: TSegmentKeyType;
  data: Uint8Array;
  status: TSegmentStatusType;
  format?: "ts" | "mp4" | "unknown"; // 新增格式字段
};

// 常量配置
const DEFAULT_CONFIG = {
  AUTO_DOWNLOAD: false,
  RETRY_NUM: 5,
  OUTPUT_MP4: false,
  FILENAME: Date.now().toString(),
  MAX_PARALLEL_NUM: 5,
  LOG: false,
} as const;

// 新增：请求超时，避免下载“卡死”
const REQUEST_TIMEOUT_MS = 10000;
function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeout = REQUEST_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const origSignal = (init as any).signal as AbortSignal | undefined;
  const onAbort = () => ctrl.abort();
  if (origSignal) {
    if (origSignal.aborted) ctrl.abort();
    else origSignal.addEventListener('abort', onAbort, { once: true });
  }
  const id = setTimeout(() => ctrl.abort(), timeout);
  const merged: RequestInit = { ...init, signal: ctrl.signal };
  return fetch(input, merged).finally(() => {
    clearTimeout(id);
    origSignal?.removeEventListener('abort', onAbort);
  });
}

// 注：不再使用 ffmpeg.wasm。保留 TS→MP4 的 mux.js 路径，以及 fMP4 合并的仅视频路径。

export class M3U8Downloader {
  private url: string;
  private readonly autoDownload: boolean;
  private readonly filename: string;
  private readonly retryNum: number;
  private readonly excludes?: (string | RegExp)[];
  private outputMp4: boolean; // 改为可修改
  private readonly outputFormat: 'mp4' | 'webm' | 'avi' | 'mov' | 'mkv' | 'ts';
  private readonly syncMode: 'strict' | 'compatible' | 'fast';
  private readonly maxParallelNum: number;
  private readonly log: boolean;
  private readonly allAesKeys: Map<string, Promise<Uint32Array>> = new Map();
  private readonly onUpdated?: M3U8DownloaderOptions["onUpdated"];
  private readonly onParsed?: M3U8DownloaderOptions["onParsed"];
  private readonly onDownloaded?: M3U8DownloaderOptions["onDownloaded"];
  private readonly onProgress?: M3U8DownloaderOptions["onProgress"];
  private readonly onFinish?: M3U8DownloaderOptions["onFinish"];
  private segments: TSegmentType[] = [];
  private duration: number = 0;
  public status: TSegmentStatusType = "waiting";
  private readonly controller: AbortController;
  public progress: number = 0;
  public finishSegments: any = null;
  public videoInfo: any;
  public fileSize: number = 0;
  private completedSegments: number = 0; // 跟踪已完成的片段数量
  private headers: Record<string, string> = {};
  // HLS fMP4 初始化段（EXT-X-MAP）
  private initMapUri?: string;
  private initMapByteRange?: { length: number; offset: number };
  private initSegmentData?: Uint8Array | null;

  constructor(options: M3U8DownloaderOptions) {
    const {
      url = "",
      autoDownload = DEFAULT_CONFIG.AUTO_DOWNLOAD,
      filename = DEFAULT_CONFIG.FILENAME,
      retryNum = DEFAULT_CONFIG.RETRY_NUM,
      excludes,
      outputMp4 = DEFAULT_CONFIG.OUTPUT_MP4,
      outputFormat = 'mp4',
      syncMode = 'compatible',
      maxParallelNum = DEFAULT_CONFIG.MAX_PARALLEL_NUM,
      log = DEFAULT_CONFIG.LOG,
      videoInfo,
      onUpdated,
      onParsed,
      onDownloaded,
      onProgress,
      onFinish,
    } = options;

    if (videoInfo) {
      const requestHeadersArray = JSON.parse(
        JSON.stringify(videoInfo.requestHeaders)
      ) as Array<{ name: string; value: string }> | undefined;
      const headers =
        requestHeadersArray?.reduce((acc: Record<string, string>, header: { name: string; value: string }) => {
          // 跳过一些可能导致问题的请求头
          const skipHeaders = [
            "content-length",
            "content-encoding",
            "transfer-encoding",
            "connection",
            "upgrade",
            "host", // host 会自动设置
          ];

          if (!skipHeaders.includes(header.name)) {
            acc[header.name] = header.value;
          }
          return acc;
        }, {} as Record<string, string>) || {};
      this.headers = headers;
    }

    this.url = url;
    this.videoInfo = videoInfo;

    this.autoDownload = autoDownload;
    this.filename = filename;
    this.retryNum = retryNum;
    this.excludes = excludes;
    this.outputMp4 = outputMp4;
    this.outputFormat = outputFormat;
    this.syncMode = syncMode;
    this.maxParallelNum = maxParallelNum;
    this.log = log;
    this.onUpdated = onUpdated;
    this.onParsed = onParsed;
    this.onDownloaded = onDownloaded;
    this.onProgress = onProgress;
    this.onFinish = onFinish;
    this.controller = new AbortController();
  }

  // 开始下载
  async start() {
    this.status = "pending";
    this.segments = [];
    this.completedSegments = 0; // 重置已完成片段计数器
    this.progress = 0; // 重置进度
    await this.parserM3u8();
    await this.startDownloadAllTs();
  }

  // 设置m3u8地址
  setUrl(url: string) {
    this.url = url;
  }

  // 解析m3u8文件
  async parserM3u8() {
    if (this.log) console.log("开始请求并解析m3u8内容...");
    try {
      // 使用带超时的 fetch
      const response = await fetchWithTimeout(this.url, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new M3U8DownloaderError(
          `请求未能获取m3u8内容: ${response.status}`,
          "FETCH_ERROR"
        );
      }
      const content = await response.text();
      const parser = new m3u8Parser.Parser();
      parser.push(content);
      parser.end();

      if (!parser.manifest.segments || parser.manifest.segments.length === 0) {
        await this.fetchPlaylist(parser.manifest);
        return;
      }

      // 记录 EXT-X-MAP（初始化段）
      const firstSeg: any = parser.manifest.segments?.[0];
      if (firstSeg?.map?.uri) {
        const mapUri: string = firstSeg.map.uri;
        this.initMapUri = new URL(mapUri, this.url).href;
        if (firstSeg.map.byterange && typeof firstSeg.map.byterange === 'object') {
          const br = firstSeg.map.byterange as { length?: number; offset?: number };
          if (typeof br.length === 'number') {
            this.initMapByteRange = { length: br.length, offset: br.offset ?? 0 };
          }
        }
        console.log('检测到 EXT-X-MAP 初始化段:', this.initMapUri, this.initMapByteRange);
        // 预先拉取初始化段
        await this.fetchInitSegment();
      }

      this.segments = this.filterSegments(parser.manifest.segments as any);
      this.onParsed?.(this.segments);
      
      // 计算已经成功的片段数量
      this.completedSegments = this.segments.filter(seg => seg.status === "success").length;
      
      console.log("M3U8解析完成！", this.segments);

      // 可选：检测 master 中是否存在 AUDIO 分组（提示可能无声）
      const mg = (parser.manifest as any).mediaGroups?.AUDIO;
      if (mg && Object.keys(mg).length) {
        console.warn("提示：该源包含独立音频分组，若未选择带音频的变体，下载结果可能无声音。");
      }
    } catch (error) {
      this.status = "error";
      throw new M3U8DownloaderError(
        `请求并解析m3u8失败: ${(error as M3U8DownloaderError).message}`,
        "PARSE_ERROR"
      );
    }
  }

  async fetchPlaylist(manifest: any) {
    // 优先选择“自带音频且不引用 AUDIO 分组”的变体
    const playlists = manifest.playlists || [];
    if (!playlists.length) {
      throw new M3U8DownloaderError("未找到可用的播放列表", "PARSE_ERROR");
    }

    const score = (p: any) => {
      const codecs: string = p?.attributes?.CODECS || "";
      const bw: number = p?.attributes?.BANDWIDTH || 0;
      const hasAudioCodec = /mp4a|aac|ac-3|ec-3|opus/i.test(codecs);
      const refAudioGroup = !!p?.attributes?.AUDIO;

      // 评分规则：
      // 1) 带音频编码加高分
      // 2) 引用 AUDIO 分组（独立音频）减分
      // 3) 带宽作为次要排序因子
      return (hasAudioCodec ? 1000000 : 0) - (refAudioGroup ? 500000 : 0) + bw;
    };

    // 先尝试找“带音频且不引用AUDIO”的变体
    let best = playlists[0];
    for (const p of playlists) {
      if (score(p) > score(best)) best = p;
    }

    if (this.log) {
      console.log("选中的变体信息：", {
        uri: best?.uri,
        codecs: best?.attributes?.CODECS,
        bandwidth: best?.attributes?.BANDWIDTH,
        audioGroup: best?.attributes?.AUDIO || null,
      });
      if (best?.attributes?.AUDIO) {
        console.warn("注意：当前变体引用了独立音频分组，若未额外下载该分组，合并结果可能无声音。");
      }
    }

    if (!best?.uri) {
      throw new M3U8DownloaderError("未找到可用的播放列表", "PARSE_ERROR");
    }

    const nextUrl = best.uri;
    if (!(nextUrl.startsWith("https://") || nextUrl.startsWith("http://"))) {
      this.url = new URL(nextUrl, this.url).href;
    } else {
      this.url = nextUrl;
    }

    await this.parserM3u8();
  }

  // 拉取 EXT-X-MAP 初始化段
  private async fetchInitSegment(): Promise<void> {
    if (!this.initMapUri) return;
    if (this.initSegmentData) return;
    try {
      const headers = { ...this.headers };
      const initReq: RequestInit = { headers } as any;
      if (this.initMapByteRange) {
        const { length, offset } = this.initMapByteRange;
        initReq.headers = { ...headers, Range: `bytes=${offset}-${offset + length - 1}` } as any;
      }
      // 使用带超时的 fetch
      const res = await fetchWithTimeout(this.initMapUri, initReq);
      if (!res.ok) throw new Error(`初始化段拉取失败: ${res.status}`);
      const buf = await res.arrayBuffer();
      this.initSegmentData = new Uint8Array(buf);
      if (this.log) console.log('初始化段大小:', this.initSegmentData.length);
    } catch (e) {
      console.warn('初始化段获取失败，将尝试从片段中提取:', (e as Error).message);
      this.initSegmentData = null;
    }
  }

  // 过滤排除的segment
  filterSegments(segments: any[]) {
    if (!segments.length) return segments;
    return segments.flatMap((item) => {
      const url = new URL(item.uri, this.url).href;
      if (this.excludes?.length) {
        for (let i = 0; i < this.excludes.length; i++) {
          const item = this.excludes[i];
          if (typeof item === "string" && url.includes(item)) {
            return [];
          } else if (item instanceof RegExp && item.test(url)) {
            return [];
          }
        }
      }
      return {
        ...item,
        uri: url,
        status: "waiting" as TSegmentStatusType,
      };
    });
  }

  // 计算视频总时长
  calculateDuration() {
    let duration = 0;
    if (this.segments?.length) {
      duration = this.segments.reduce((prev: number, cur: any) => prev + cur.duration, 0);
    }
    this.duration = duration;
    return this.duration;
  }

  // 获取aesKey
  async getAESKey(uri: string) {
    const url = new URL(uri, this.url).href;
    let promise = this.allAesKeys.get(url);
    if (!promise) {
      promise = (async () => {
        const response = await fetchWithTimeout(url, {
          headers: this.headers,
        });
        const buffer = await response.arrayBuffer();
        const view = new DataView(buffer);
        return new Uint32Array([
          view.getUint32(0),
          view.getUint32(4),
          view.getUint32(8),
          view.getUint32(12),
        ]);
      })();
      this.allAesKeys.set(url, promise);
    }
    return promise;
  }

  // 解密Ts
  async decryptTs(
    data: Uint8Array,
    segmentKey: TSegmentKeyType
  ): Promise<Uint8Array> {
    const iv = segmentKey.iv || new Uint32Array([0, 0, 0, 0]);
    const key = await this.getAESKey(segmentKey.uri);
  return aesDecrypter.decrypt(data, key, iv) as unknown as Uint8Array;
  }

  // 下载指定下标的ts文件段
  async downloadTsByIndex(index: number) {
    const segment = this.segments[index];
    return this.downloadTs(segment, index);
  }

  /**
   * 下载ts文件
   * @param segment segment
   * @returns
   */
  async downloadTs(segment: TSegmentType, index: number) {
    const progress = `${index + 1}/${this.segments.length}`;
    if (this.log) console.log(`${progress}：开始下载片段 ${segment.uri}`);

    // 记录之前的状态，用于判断是否需要递增完成计数
    const wasAlreadySuccess = segment.status === "success";

    // 开始时不更新进度，只发送开始事件
    this.onProgress?.({
      type: "start",
      url: segment.uri,
      data: this.progress, // 保持当前进度不变
      currentIndex: this.completedSegments, // 使用已完成的片段数量，而不是索引
      totalSegments: this.segments.length,
      fileSize: this.fileSize,
    });

    const data = await this.downloadTsAndErrorRetry(
      segment,
      index,
      this.retryNum
    );
    if (this.log) {
      console.log(`%c${progress}：片段下载完成 ${segment.uri}`, "color:green");
    }

    // 只有在片段首次成功时才递增完成计数
    if (!wasAlreadySuccess) {
      this.completedSegments++;
    }
    this.progress = (this.completedSegments / this.segments.length) * 100;
    this.onProgress?.({
      type: "end",
      url: segment.uri,
      data: this.progress,
      currentIndex: this.completedSegments, // 使用实际完成的片段数量
      totalSegments: this.segments.length,
      fileSize: this.fileSize,
    });
    return data;
  }

  /**
   * 下载ts文件，如果失败则重试
   * @param segment segment
   * @param index 当前下标
   * @param retryCount 重试次数
   */
  async downloadTsAndErrorRetry(
    segment: TSegmentType,
    index: number,
    retryCount: number
  ): Promise<Uint8Array> {
    segment.status = "pending";
    try {
      // 动态设置请求头
      const segmentUrl = new URL(segment.uri);
      const m3u8Url = new URL(this.url);

      const requestHeaders = {
        ...this.headers,
        Referer: this.videoInfo?.pageUrl || m3u8Url.origin + "/",
        Origin: m3u8Url.origin,
      };

      console.log(`下载片段 ${index + 1}: ${segment.uri}`);

      // 使用带超时的 fetch，避免挂起
      const response = await fetchWithTimeout(segment.uri, {
        signal: this.controller.signal,
        headers: requestHeaders,
        credentials: "include",
        mode: "cors",
      });

      if (!response.ok) {
        console.error(`片段下载失败: ${response.status} ${response.statusText}`);
        throw new M3U8DownloaderError(
          `片段下载失败: ${response.status} ${response.statusText}`,
          "DOWNLOAD_ERROR"
        );
      }

      const buffer = await response.arrayBuffer();
      let data = new Uint8Array(buffer);

      if (buffer.byteLength === 0) {
        throw new M3U8DownloaderError("下载的片段为空", "DOWNLOAD_ERROR");
      }

      // 检测文件格式
      const format = this.detectSegmentFormat(data);
      console.log(`片段 ${index + 1} 格式: ${format}, 大小: ${data.length} 字节`);

        // 验证数据格式
        if (format === "unknown") {
          console.warn(`无法识别的片段格式: ${segment.uri}`);

          // 检查是否收到HTML错误页面
          if (data.length > 50) {
            const text = new TextDecoder().decode(data.slice(0, 100));
            if (text.includes("<html") || text.includes("<!DOCTYPE")) {
              throw new M3U8DownloaderError(
                "收到HTML页面而不是视频片段，可能是访问权限问题或链接已失效",
                "DOWNLOAD_ERROR"
              );
            }
          }

          // 检查是否是JSON错误响应
          if (data.length > 10) {
            try {
              const text = new TextDecoder().decode(data.slice(0, Math.min(200, data.length)));
              if (text.trim().startsWith('{') && text.includes('error')) {
                const jsonMatch = text.match(/\{.*\}/);
                if (jsonMatch) {
                  throw new M3U8DownloaderError(
                    `服务器返回错误响应: ${jsonMatch[0]}`,
                    "DOWNLOAD_ERROR"
                  );
                }
              }
            } catch (e) {
              // 不是JSON，继续其他检查
            }
          }

          // 如果数据太小，可能是错误响应
          if (data.length < 100) {
            const text = new TextDecoder().decode(data);
            console.warn(`片段数据异常小 (${data.length} 字节):`, text.substring(0, 50));
          }
        }

      this.fileSize += buffer.byteLength;

      // 如果有加密，进行解密
      if (segment.key) {
        const decryptedData = await this.decryptTs(data, segment.key);
        data = new Uint8Array(decryptedData);
      }

      segment.status = "success";
      segment.data = new Uint8Array(data);

      // 保存格式信息
      segment.format = format;

      if (typeof this.onUpdated === "function") {
        this.onUpdated(segment, index, this.segments);
      }

      return data;
    } catch (e) {
      const error = e as Error;
      
      // 识别不同类型的错误
      let errorType = "下载错误";
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        errorType = "请求超时";
      } else if (error.message.includes("网络")) {
        errorType = "网络错误";
      }
      
      console.error(`片段${errorType} (${index + 1}/${this.segments.length}):`, error.message);

      if (retryCount > 0) {
        const retryIndex = this.retryNum - retryCount + 1;
        console.log(`重试下载片段 (${retryIndex}/${this.retryNum}) - ${errorType}: ${segment.uri}`);
        
        // 发送重试进度事件
        this.onProgress?.({
          type: "start",
          url: segment.uri,
          data: this.progress,
          currentIndex: this.completedSegments,
          totalSegments: this.segments.length,
          fileSize: this.fileSize,
        });
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        return await this.downloadTsAndErrorRetry(segment, index, retryCount - 1);
      } else {
        segment.status = "error";

        const progress = `${index + 1}/${this.segments.length}`;
        const errorMessage = `片段 ${index + 1} 下载失败 (${errorType}): ${error.message}`;
        
        console.error(`%c${progress}：${errorMessage}`, "color:red");

        this.onProgress?.({
          type: "error",
          url: segment.uri,
          data: this.progress, // 保持当前进度不变
          currentIndex: this.completedSegments, // 使用已完成的片段数量
          totalSegments: this.segments.length,
          fileSize: this.fileSize,
          error: errorMessage, // 添加详细的错误信息
        });

        if (typeof this.onUpdated === "function") {
          this.onUpdated(segment, index, this.segments);
        }

        throw new Error(errorMessage);
      }
    }
  }

  // 添加检测文件格式的方法
  private detectSegmentFormat(data: Uint8Array): "ts" | "mp4" | "unknown" {
    if (data.length < 8) return "unknown";

    // 检查 TS 格式 (0x47 同步字节)
    // TS 包通常是 188 字节，检查多个位置的同步字节
    if (data[0] === 0x47) {
      // 进一步验证：检查第二个包的同步字节（如果存在）
      if (data.length >= 188 && data[188] === 0x47) {
        return "ts";
      }
      // 如果只有一个包或者长度不够，仍然认为是 TS
      return "ts";
    }

    // 检查 MP4 格式
    try {
      // ftyp box 或 styp box
      const header = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(4, 8));
      if (header === "ftyp" || header === "styp") {
        return "mp4";
      }

      // 检查 moof box (fragmented MP4)
      if (header === "moof") {
        return "mp4";
      }

      // 检查其他 MP4 box 类型
      if (["moov", "mdat", "free", "skip", "wide"].includes(header)) {
        return "mp4";
      }

      // 检查是否是 MP4 容器的其他常见 box
      const boxSize = new DataView(data.buffer, data.byteOffset).getUint32(0);
      if (boxSize > 8 && boxSize <= data.length) {
        // 检查更多 MP4 box 类型
        const extendedHeaders = ["sidx", "uuid", "prft", "emsg"];
        if (extendedHeaders.includes(header)) {
          return "mp4";
        }
      }
    } catch (e) {
      // 解码失败，继续其他检测
    }

    // 检查是否是加密的 TS 片段（某些情况下可能没有标准的同步字节）
    if (this.isLikelyEncryptedTS(data)) {
      return "ts";
    }

    return "unknown";
  }

  // 检查是否可能是加密的 TS 片段
  private isLikelyEncryptedTS(data: Uint8Array): boolean {
    if (data.length < 16) return false;
    
    // 检查是否有 AES 加密的特征（通常是随机数据）
    // 如果前几个字节看起来像随机数据，可能是加密的 TS
    const entropy = this.calculateEntropy(data.slice(0, Math.min(64, data.length)));
    return entropy > 7.5; // 高熵值可能表示加密数据
  }

  // 计算数据熵值
  private calculateEntropy(data: Uint8Array): number {
    const freq: number[] = new Array(256).fill(0);
    for (let i = 0; i < data.length; i++) {
      freq[data[i]]++;
    }
    
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / data.length;
        entropy -= p * Math.log2(p);
      }
    }
    
    return entropy;
  }

  /**
   * 队列执行函数
   * @param asyncFunction 异步函数
   * @param params  参数数组
   * @param maxConcurrent  最大并发数
   * @returns 结果数组
   */
  async executeAsyncFunctionInQueue<T, K>(
    asyncFunction: (item: K, index: number) => Promise<T>,
    items: K[],
    maxConcurrent: number = 10
  ): Promise<Array<T | Error>> {
    const queue = [...items];
    const results: Array<T | Error> = new Array(items.length);
    const executing = new Set<Promise<void>>();

    const executeNext = async (): Promise<void> => {
      if (queue.length === 0) return;

      const currentIndex = items.length - queue.length;
      const item = queue.shift()!;

      const promise = (async () => {
        try {
          const result = await asyncFunction.call(this, item, currentIndex);
          results[currentIndex] = result;
        } catch (error) {
          results[currentIndex] =
            error instanceof Error ? error : new Error(String(error));
        }
      })();

      executing.add(promise);
      await promise;
      executing.delete(promise);

      if (queue.length > 0) {
        await executeNext();
      }
    };

    const workers = Array.from(
      { length: Math.min(maxConcurrent, queue.length) },
      () => executeNext()
    );

    await Promise.all(workers);
    return results;
  }

  // 开始下载全部ts文件
  async startDownloadAllTs() {
    if (this.log) console.log("开始下载全部ts文件");
    await this.executeAsyncFunctionInQueue(
      this.downloadTs,
      this.segments,
      this.maxParallelNum
    );
    const isError = this.segments.some((segment) => !segment.data);
    if (this.log)
      console.log(`全部ts文件下载完成，${isError ? "有错误" : "无错误"}`);

    if (!isError) {
      this.mergeSegments();
      if (this.autoDownload) {
        await this.download();
      }
      if (typeof this.onFinish === "function") {
        this.onFinish();
      }
    } else {
      this.status = "error";
      return {
        isError,
        segments: this.segments,
      };
    }
  }

  // 合并所有ts文件
  mergeSegments() {
    if (this.log) console.log("开始合并片段...", this.segments);

    const validSegments = this.segments.filter((segment) => {
      if (segment.status !== "success" || !segment.data) {
        console.warn(`跳过无效片段: ${segment.uri}, 状态: ${segment.status}`);
        return false;
      }
      return true;
    });

    if (validSegments.length === 0) {
      throw new M3U8DownloaderError("没有有效的片段合并", "MERGE_ERROR");
    }

    // 检查片段格式和质量
    const formats = [...new Set(validSegments.map(s => s.format).filter(Boolean))];
    const formatStats = this.analyzeSegmentFormats(validSegments);
    
    console.log('片段分析结果:', formatStats);
    
    // 如果是 MP4 片段，强制设置为 MP4 输出
    if (formats.includes('mp4')) {
      console.log('检测到 MP4 片段，强制设置为 MP4 格式输出');
      this.outputMp4 = true;
    }

    // 检查是否有格式不一致的问题
    if (formats.length > 1) {
      console.warn(`警告: 检测到多种片段格式 (${formats.join(', ')})，可能影响播放兼容性`);
    }

    this.finishSegments = validSegments.map(segment => segment.data);
    
    const successRate = (validSegments.length / this.segments.length * 100).toFixed(1);
    console.log(`片段合并准备完成: ${validSegments.length}/${this.segments.length} (${successRate}%)`);
    
    // 如果成功率较低，给出警告
    if (validSegments.length / this.segments.length < 0.9) {
      console.warn(`警告: 片段成功率较低 (${successRate}%)，最终视频可能不完整`);
    }
  }

  // 分析片段格式统计
  private analyzeSegmentFormats(segments: TSegmentType[]): any {
    const stats = {
      totalSegments: segments.length,
      formatDistribution: {} as Record<string, number>,
      sizeStats: {
        min: Number.MAX_SAFE_INTEGER,
        max: 0,
        average: 0,
        total: 0
      }
    };

    let totalSize = 0;
    
    for (const segment of segments) {
      // 格式统计
      const format = segment.format || 'unknown';
      stats.formatDistribution[format] = (stats.formatDistribution[format] || 0) + 1;
      
      // 大小统计
      const size = segment.data?.length || 0;
      totalSize += size;
      stats.sizeStats.min = Math.min(stats.sizeStats.min, size);
      stats.sizeStats.max = Math.max(stats.sizeStats.max, size);
    }
    
    stats.sizeStats.average = Math.round(totalSize / segments.length);
    stats.sizeStats.total = totalSize;
    
    // 如果最小值还是初始值，说明没有有效数据
    if (stats.sizeStats.min === Number.MAX_SAFE_INTEGER) {
      stats.sizeStats.min = 0;
    }
    
    return stats;
  }

  // 使用mux.js转码为mp4（已弃用，使用 mediabunny 替代）
  async transcodeToMp4ByMux(segments?: Uint8Array[]): Promise<Uint8Array[]> {
    // if (this.log) console.log("开始转码MP4");
    // if (!window.muxjs) return Promise.reject(new Error("mux.js 未加载"));
    // if (!segments) {
    //   segments = this.segments
    //     .filter((segment) => segment.status === "success" && segment.data)
    //     .map((segment) => segment.data);
    // }
    // const buffer = new Uint8Array(await new Blob(segments).arrayBuffer());
    // return new Promise((resolve) => {
    //   const duration = this.calculateDuration();
    //   const transmuxer = new window.muxjs!.Transmuxer({
    //     keepOriginalTimestamps: true,
    //     duration,
    //   });
    //   transmuxer.on(
    //     "data",
    //     (segment: { initSegment: Uint8Array; data: Uint8Array }) => {
    //       resolve([segment.initSegment, segment.data]);
    //     }
    //   );
    //   transmuxer.push(buffer);
    //   transmuxer.flush();
    // });
    throw new Error("transcodeToMp4ByMux 已弃用，请使用 transcodeToMp4ByMuxFallback 作为回退方案");
  }

  // 使用 mux.js 转码为 MP4（优化版本，解决音画同步问题）
  async transcodeToMp4ByMuxFallback(segments?: Uint8Array[]): Promise<Uint8Array[]> {
    if (this.log) console.log("使用 mux.js 开始转码 MP4（优化版本）");
    if (!window.muxjs) {
      throw new M3U8DownloaderError("mux.js 未加载", "MERGE_ERROR");
    }
    
    if (!segments) {
      segments = this.segments
        .filter((segment) => segment.status === "success" && segment.data)
        .map((segment) => segment.data);
    }

    // 预处理片段以确保音画同步
    const processedSegments = await this.preprocessSegmentsForSync(segments);
    
    return new Promise((resolve, reject) => {
      try {
        // 根据同步模式配置 mux.js 参数
        const muxConfig = this.getMuxConfigForSyncMode();
        const transmuxer = new window.muxjs!.Transmuxer(muxConfig);

        let initSegment: Uint8Array | null = null;
        const mediaSegments: Uint8Array[] = [];
        let hasReceivedData = false;

        transmuxer.on('data', (segment: any) => {
          hasReceivedData = true;
          
          if (segment.initSegment) {
            initSegment = segment.initSegment;
            if (this.log) console.log('mux.js 生成初始化段，大小:', segment.initSegment.length);
          }
          
          if (segment.data) {
            mediaSegments.push(segment.data);
            if (this.log) console.log('mux.js 生成媒体段，大小:', segment.data.length);
          }
        });

        transmuxer.on('done', () => {
          if (this.log) console.log('mux.js 转码完成');
          
          if (!hasReceivedData || !initSegment) {
            reject(new M3U8DownloaderError(
              "mux.js 转码未生成有效数据",
              "MERGE_ERROR"
            ));
            return;
          }

          // 返回初始化段和所有媒体段
          const result = [initSegment, ...mediaSegments];
          if (this.log) {
            console.log(`mux.js 转码结果: 初始化段 + ${mediaSegments.length} 个媒体段`);
          }
          resolve(result);
        });

        transmuxer.on('error', (error: any) => {
          reject(new M3U8DownloaderError(
            `mux.js 转码错误: ${error.message || error}`,
            "MERGE_ERROR"
          ));
        });

        // 逐个推送片段而不是一次性推送所有数据
        // 这有助于 mux.js 更好地处理时间戳
        for (let i = 0; i < processedSegments.length; i++) {
          const segment = processedSegments[i];
          if (this.log && i % 10 === 0) {
            console.log(`推送片段 ${i + 1}/${processedSegments.length}`);
          }
          transmuxer.push(segment);
        }
        
        transmuxer.flush();
        
      } catch (error) {
        reject(new M3U8DownloaderError(
          `mux.js 转码失败: ${(error as Error).message}`,
          "MERGE_ERROR"
        ));
      }
    });
  }

  // 预处理片段以确保音画同步
  private async preprocessSegmentsForSync(segments: Uint8Array[]): Promise<Uint8Array[]> {
    if (this.log) console.log(`预处理片段以优化音画同步 (模式: ${this.syncMode})`);
    
    // 先验证音画同步质量
    const syncValidation = this.validateAudioVideoSync(segments);
    if (syncValidation.issues.length > 0) {
      if (this.log) {
        console.warn("检测到潜在的音画同步问题:", syncValidation.issues);
        if (this.syncMode === 'fast') {
          console.warn("建议使用 'compatible' 或 'strict' 模式以获得更好的同步效果");
        }
      }
    }
    
    const processedSegments: Uint8Array[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // 验证片段完整性
      if (!segment || segment.length === 0) {
        if (this.log) console.warn(`跳过空片段 ${i + 1}`);
        continue;
      }

      // 检查 TS 包的完整性
      if (segment[0] === 0x47) {
        // 根据同步模式决定处理策略
        let alignedSegment: Uint8Array | null = null;
        
        if (this.syncMode === 'strict') {
          // 严格模式：确保完美对齐
          alignedSegment = this.alignTSPackets(segment);
        } else if (this.syncMode === 'compatible') {
          // 兼容模式：尝试对齐，失败则保留原始数据
          alignedSegment = this.alignTSPackets(segment) || segment;
        } else {
          // 快速模式：跳过对齐检查
          alignedSegment = segment;
        }
        
        if (alignedSegment) {
          processedSegments.push(alignedSegment);
        } else {
          if (this.log) console.warn(`无法对齐片段 ${i + 1}，跳过`);
        }
      } else {
        // 非 TS 格式，直接添加
        processedSegments.push(segment);
      }
    }
    
    if (this.log) {
      console.log(`片段预处理完成: ${processedSegments.length}/${segments.length} 个片段可用`);
      if (processedSegments.length < segments.length * 0.9) {
        console.warn("大量片段被跳过，可能影响播放质量");
      }
    }
    
    return processedSegments;
  }

  // 对齐 TS 包以确保完整性
  private alignTSPackets(segment: Uint8Array): Uint8Array | null {
    const TS_PACKET_SIZE = 188;
    
    // 找到第一个同步字节
    let startIndex = -1;
    for (let i = 0; i < Math.min(segment.length, 1000); i++) {
      if (segment[i] === 0x47) {
        // 验证这是一个有效的 TS 包开始
        if (i + TS_PACKET_SIZE < segment.length && segment[i + TS_PACKET_SIZE] === 0x47) {
          startIndex = i;
          break;
        }
      }
    }
    
    if (startIndex === -1) {
      return null; // 找不到有效的 TS 包
    }
    
    // 计算完整包的数量
    const remainingBytes = segment.length - startIndex;
    const completePackets = Math.floor(remainingBytes / TS_PACKET_SIZE);
    
    if (completePackets === 0) {
      return null; // 没有完整的包
    }
    
    // 返回对齐的完整包
    const alignedLength = completePackets * TS_PACKET_SIZE;
    return segment.slice(startIndex, startIndex + alignedLength);
  }

  // 根据同步模式获取 mux.js 配置
  private getMuxConfigForSyncMode(): any {
    const baseConfig = {
      // 基础配置
      remux: true,
    };

    switch (this.syncMode) {
      case 'strict':
        // 严格模式：最佳音画同步，但可能较慢
        return {
          ...baseConfig,
          keepOriginalTimestamps: false, // 重新生成时间戳
          alignGopsAtEnd: true, // 对齐 GOP
          correctTimestamps: true, // 修正时间戳
          // 启用额外的同步检查
          enableTimestampRolloverStream: true,
        };
        
      case 'compatible':
        // 兼容模式：平衡同步质量和兼容性（默认）
        return {
          ...baseConfig,
          keepOriginalTimestamps: false, // 重新生成时间戳
          alignGopsAtEnd: true, // 对齐 GOP
          // 适度的时间戳处理
        };
        
      case 'fast':
        // 快速模式：优先速度，可能有轻微同步问题
        return {
          ...baseConfig,
          keepOriginalTimestamps: true, // 保留原始时间戳，更快
          alignGopsAtEnd: false, // 不对齐 GOP，更快
        };
        
      default:
        return {
          ...baseConfig,
          keepOriginalTimestamps: false,
          alignGopsAtEnd: true,
        };
    }
  }

  // 验证音画同步质量（简单检查）
  private validateAudioVideoSync(segments: Uint8Array[]): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    let isValid = true;

    if (this.log) console.log("验证音画同步质量...");

    // 检查片段数量
    if (segments.length < 2) {
      issues.push("片段数量太少，无法验证同步");
      isValid = false;
      return { isValid, issues };
    }

    // 检查片段大小一致性
    const segmentSizes = segments.map(s => s.length);
    const avgSize = segmentSizes.reduce((a, b) => a + b, 0) / segmentSizes.length;
    const sizeVariation = segmentSizes.map(size => Math.abs(size - avgSize) / avgSize);
    const maxVariation = Math.max(...sizeVariation);

    if (maxVariation > 0.5) {
      issues.push(`片段大小差异过大 (${(maxVariation * 100).toFixed(1)}%)，可能影响同步`);
      // 不标记为无效，只是警告
    }

    // 检查 TS 包完整性
    let tsPacketIssues = 0;
    for (const segment of segments) {
      if (segment[0] === 0x47) {
        // 检查 TS 包对齐
        if (segment.length % 188 !== 0) {
          tsPacketIssues++;
        }
      }
    }

    if (tsPacketIssues > segments.length * 0.1) {
      issues.push(`${tsPacketIssues} 个片段存在 TS 包对齐问题，可能影响同步`);
      // 不标记为无效，只是警告
    }

    if (this.log && issues.length > 0) {
      console.warn("音画同步验证发现问题:", issues);
    } else if (this.log) {
      console.log("音画同步验证通过");
    }

    return { isValid, issues };
  }

  // 注意：mediabunny 不支持 TS 输入，已移除相关代码
  // 如需要其他格式输出，请使用 convertMP4ToOtherFormat 方法

  // TS 转 MP4 的完整回退逻辑
  private async convertTSToMP4WithFallback(): Promise<Blob> {
    const conversionMethods = [
      {
        name: "mux.js",
        description: "使用 mux.js 转码",
        convert: () => this.transcodeToMp4ByMuxFallback(this.finishSegments),
        available: () => !!window.muxjs
      },
      {
        name: "simple-concat",
        description: "简单拼接（可能不兼容所有播放器）",
        convert: () => this.simpleSegmentConcat()
      }
    ];

    let lastError: Error | null = null;
    
    for (const method of conversionMethods) {
      // 检查方法是否可用
      if (method.available && !method.available()) {
        if (this.log) console.log(`跳过 ${method.name}：不可用`);
        continue;
      }

      try {
        if (this.log) console.log(`尝试 ${method.description}...`);
        
        const result = await method.convert();
        
        if (result instanceof Uint8Array) {
          if (this.log) console.log(`${method.description} 转码成功，大小: ${result.length} 字节`);
          return new Blob([new Uint8Array(result)], { type: 'video/mp4' });
        } else if (Array.isArray(result)) {
          if (this.log) console.log(`${method.description} 转码成功，片段数: ${result.length}`);
          return new Blob(result.map((r: Uint8Array) => new Uint8Array(r)), { type: 'video/mp4' });
        }
        
      } catch (error) {
        lastError = error as Error;
        const errorMsg = lastError.message;
        
        if (this.log) {
          console.warn(`${method.description} 失败:`, errorMsg);
        }
        
        // 记录详细的错误信息以便调试
        if (method.name === "mediabunny") {
          this.logMediabunnyError(errorMsg);
        }
        
        continue;
      }
    }

    // 所有方法都失败了，返回原始 TS 数据
    console.warn('所有 MP4 转码方法都失败，返回原始 TS 格式');
    console.warn('最后一个错误:', lastError?.message);
    
    // 强制设置为 TS 输出
    this.outputMp4 = false;
    
    return new Blob(this.finishSegments.map((s: Uint8Array) => new Uint8Array(s)), { 
      type: 'video/mp2t' 
    });
  }

  // 记录 mediabunny 详细错误信息
  private logMediabunnyError(errorMsg: string): void {
    if (this.log) {
      console.group('mediabunny 错误详情');
      console.log('错误消息:', errorMsg);
      
      // 分析可能的原因
      if (errorMsg.includes('unsupported or unrecognizable format')) {
        console.log('可能原因:');
        console.log('- TS 片段格式不标准或损坏');
        console.log('- 缺少必要的 PAT/PMT 表');
        console.log('- 片段加密但未正确解密');
        console.log('- 编码格式不受 mediabunny 支持');
      }
      
      if (errorMsg.includes('No valid tracks')) {
        console.log('可能原因:');
        console.log('- 片段中没有有效的音视频轨道');
        console.log('- 编码参数不正确');
        console.log('- 片段数据不完整');
      }
      
      // 提供调试建议
      console.log('调试建议:');
      console.log('- 检查片段格式检测结果');
      console.log('- 验证片段完整性');
      console.log('- 尝试使用其他转码方法');
      
      console.groupEnd();
    }
  }

  // 简单的片段拼接方法（作为最后的回退）
  private async simpleSegmentConcat(): Promise<Uint8Array> {
    if (this.log) console.log('使用简单拼接方法合并片段');
    
    if (!this.finishSegments || this.finishSegments.length === 0) {
      throw new Error('没有可用的片段进行拼接');
    }

    // 计算总大小
    const totalSize = this.finishSegments.reduce((sum: number, segment: Uint8Array) => sum + segment.length, 0);
    
    if (totalSize === 0) {
      throw new Error('所有片段都为空');
    }

    // 创建合并后的数组
    const merged = new Uint8Array(totalSize);
    let offset = 0;
    
    for (let i = 0; i < this.finishSegments.length; i++) {
      const segment = this.finishSegments[i];
      if (segment && segment.length > 0) {
        merged.set(segment, offset);
        offset += segment.length;
      }
    }
    
    if (this.log) {
      console.log(`简单拼接完成: ${this.finishSegments.length} 个片段，总大小: ${totalSize} 字节`);
    }
    
    return merged;
  }

  // 使用 mediabunny 将 MP4 转换为其他格式
  async convertMP4ToOtherFormat(mp4Data: Uint8Array, targetFormat: 'webm' | 'avi' | 'mov' | 'mkv'): Promise<Uint8Array> {
    if (this.log) console.log(`使用 mediabunny 将 MP4 转换为 ${targetFormat.toUpperCase()}`);
    
    try {
      const mp4Blob = new Blob([new Uint8Array(mp4Data)], { type: 'video/mp4' });
      
      if (this.log) {
        console.log("mediabunny 格式转换输入信息:", {
          inputFormat: 'mp4',
          outputFormat: targetFormat,
          inputSize: mp4Blob.size,
        });
      }
      
      // 创建 mediabunny 输入
      const input = new Input({
        formats: ALL_FORMATS,
        source: new BlobSource(mp4Blob),
      });

      // 根据目标格式创建输出配置
      const outputFormat = this.createOutputFormat(targetFormat);
      const output = new Output({
        format: outputFormat,
        target: new BufferTarget(),
      });

      // 创建转换
      const conversion = await Conversion.init({ input, output });
      
      if (!conversion.isValid) {
        const discardedInfo = conversion.discardedTracks.map(track => ({
          track: track.track,
          reason: track.reason,
        }));
        
        throw new Error(`MP4 到 ${targetFormat} 转换无效，被丢弃的轨道: ${JSON.stringify(discardedInfo)}`);
      }

      if (this.log) {
        console.log(`mediabunny MP4→${targetFormat} 转换有效，轨道信息:`, {
          utilizedTracks: conversion.utilizedTracks.length,
          discardedTracks: conversion.discardedTracks.length
        });
      }

      // 执行转换
      if (this.log) {
        conversion.onProgress = (progress) => {
          console.log(`mediabunny MP4→${targetFormat} 转换进度: ${(progress * 100).toFixed(1)}%`);
        };
      }

      await conversion.execute();
      
      const buffer = output.target.buffer;
      if (!buffer || buffer.byteLength === 0) {
        throw new Error(`MP4 到 ${targetFormat} 转换后未生成有效数据`);
      }
      
      if (this.log) console.log(`输出 ${targetFormat.toUpperCase()} 大小:`, buffer.byteLength);
      return new Uint8Array(buffer);
      
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error(`MP4 到 ${targetFormat} 转换失败:`, errorMsg);
      
      throw new M3U8DownloaderError(
        `使用 mediabunny 将 MP4 转换为 ${targetFormat} 失败: ${errorMsg}`,
        "MERGE_ERROR"
      );
    }
  }

  // 创建不同格式的输出配置
  private createOutputFormat(format: 'webm' | 'avi' | 'mov' | 'mkv'): any {
    const mediabunny = (window as any).mediabunny;
    
    switch (format) {
      case 'webm':
        // 使用 WebM 格式，VP9 视频编码 + Opus 音频编码
        if (mediabunny?.WebmOutputFormat) {
          return new mediabunny.WebmOutputFormat({
            videoCodec: 'vp9',
            audioCodec: 'opus',
          });
        }
        return new Mp4OutputFormat(); // 回退到 MP4 如果 WebM 不可用
        
      case 'avi':
        // AVI 格式通常使用 H.264 + AAC
        if (mediabunny?.AviOutputFormat) {
          return new mediabunny.AviOutputFormat({
            videoCodec: 'h264',
            audioCodec: 'aac',
          });
        }
        return new Mp4OutputFormat();
        
      case 'mov':
        // MOV 格式（QuickTime）
        if (mediabunny?.MovOutputFormat) {
          return new mediabunny.MovOutputFormat({
            videoCodec: 'h264',
            audioCodec: 'aac',
          });
        }
        return new Mp4OutputFormat();
        
      case 'mkv':
        // MKV 格式
        if (mediabunny?.MkvOutputFormat) {
          return new mediabunny.MkvOutputFormat({
            videoCodec: 'h264',
            audioCodec: 'aac',
          });
        }
        return new Mp4OutputFormat();
        
      default:
        return new Mp4OutputFormat();
    }
  }

  // 下载最终文件
  async download() {
    const blob = await this.getBlob();
    if (typeof this.onDownloaded === "function") this.onDownloaded(blob);
    if (this.log) console.log("数据准备完成，开始下载");
    this.saveAs(blob);
    this.status = "success";
  }

  // 统一的数据获取方法
  async getBlob(): Promise<Blob> {
    if (!this.finishSegments) {
      throw new M3U8DownloaderError("没有可用的片段数据", "MERGE_ERROR");
    }

    // 检查是否有 MP4 格式的片段
    const hasMp4 = this.segments.some(s => s.format === 'mp4');
    
    console.log('格式检测结果:', {
      hasMp4,
      outputMp4: this.outputMp4,
      outputFormat: this.outputFormat,
      segmentFormats: this.segments.map(s => s.format).filter(Boolean)
    });
    
    // 如果输出格式是 TS，直接返回 TS 数据
    if (this.outputFormat === 'ts' && !hasMp4) {
      console.log('使用 TS 格式输出');
      return await this.getTSData();
    }
    
    // 否则需要先转换为 MP4
    const mp4Data = await this.getMP4Data();
    
    // 如果输出格式不是 MP4，需要进一步转换
    if (this.outputFormat !== 'mp4' && this.outputFormat !== 'ts') {
      console.log(`使用 ${this.outputFormat.toUpperCase()} 格式输出`);
      try {
        const mp4Buffer = await mp4Data.arrayBuffer();
        const convertedData = await this.convertMP4ToOtherFormat(
          new Uint8Array(mp4Buffer), 
          this.outputFormat as 'webm' | 'avi' | 'mov' | 'mkv'
        );
        return new Blob([new Uint8Array(convertedData)], { type: this.getMimeType(this.outputFormat) });
      } catch (error) {
        console.warn(`转换为 ${this.outputFormat} 失败，回退到 MP4:`, (error as Error).message);
        return mp4Data;
      }
    }
    
    console.log('使用 MP4 格式输出');
    return mp4Data;
  }

  // 获取 MIME 类型
  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'mkv': 'video/x-matroska',
      'ts': 'video/mp2t'
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  // 添加新的获取数据方法
  async getTSData() {
    // 检查是否真的是 TS 格式
    const hasTs = this.segments.some(s => s.format === 'ts');
    if (!hasTs) {
      console.warn('警告: 没有检测到 TS 格式片段，可能需要使用 MP4 格式');
    }
    return new Blob(this.finishSegments.map((s: Uint8Array) => new Uint8Array(s)), { type: "video/mp2t" });
  }

  async getMP4Data() {
    // 优先确保已获取初始化段
    await this.fetchInitSegment();

    const hasMp4 = this.segments.some(s => s.format === 'mp4');
    if (!hasMp4) {
      // TS → MP4 路径
      console.log('未检测到 fMP4 片段，走 TS→MP4 路径');
      return await this.convertTSToMP4WithFallback();
    }

    // fMP4 路径：必须确保有正确的 init（包含 moov）
    let init = this.initSegmentData ?? null;
    if (!init || !this.containsMoov(init)) init = this.extractInitFromSegments();
    if (!init || !this.containsMoov(init)) {
      console.warn('未能获取包含 moov 的初始化段，合并后的文件可能无法在常规播放器中播放');
      return new Blob(this.finishSegments, { type: 'video/mp4' });
    }

    const mediaData = this.mergeMediaData(
      this.segments.filter(s => s.status === 'success' && s.data).map(s => s.data)
    );
    const videoFmp4 = new Uint8Array(init.length + mediaData.length);
    videoFmp4.set(init, 0);
    videoFmp4.set(mediaData, init.length);

    // 如果存在独立音频（之前逻辑可设置 finishAudioSegments），当前不做复用，直接返回仅视频的 fMP4
    const hasExternalAudio = (this as any).finishAudioSegments && (this as any).finishAudioSegments.length > 0;
    if (hasExternalAudio) {
      console.warn('检测到独立音频分组，当前未启用 ffmpeg 复用，将导出仅视频 MP4');
    }
    return new Blob([videoFmp4], { type: 'video/mp4' });
  }

  // 简单的 fMP4 合并方案
  private extractInitFromSegments(): Uint8Array | null {
    const segs = this.segments
      .filter(s => s.status === 'success' && s.data)
      .map(s => s.data);
    if (segs.length === 0) return null;
    // 在前几个片段里找 ftyp + moov
    const maxProbe = Math.min(5, segs.length);
    for (let i = 0; i < maxProbe; i++) {
      const init = this.extractInitializationData(segs[i]);
      if (init && this.containsMoov(init)) return init;
    }
    return null;
  }

  // 检查是否包含初始化数据
  private containsMoov(data: Uint8Array): boolean {
    for (let i = 0; i < data.length - 8; ) {
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const size = dv.getUint32(i);
      const type = new TextDecoder().decode(data.slice(i + 4, i + 8));
      if (type === 'moov') return true;
      if (!size) break;
      i += size;
    }
    return false;
  }

  // 提取初始化数据
  private extractInitializationData(data: Uint8Array): Uint8Array {
    const boxes: Uint8Array[] = [];
    let offset = 0;
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    while (offset + 8 <= data.length) {
      const size = dv.getUint32(offset);
      const type = new TextDecoder().decode(data.slice(offset + 4, offset + 8));
      if (['ftyp', 'styp', 'moov'].includes(type)) {
        boxes.push(data.slice(offset, offset + size));
      }
      if (!size) break;
      offset += size;
    }
    const total = boxes.reduce((s, b) => s + b.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const b of boxes) {
      out.set(b, pos);
      pos += b.length;
    }
    return out;
  }

  // 不再生成假的 init；必须使用真实含 moov 的初始化段

  // 合并媒体数据
  private mergeMediaData(segments: Uint8Array[]): Uint8Array {
    const mediaParts: Uint8Array[] = [];
    
    for (const segment of segments) {
      let offset = 0;
      
      // 跳过初始化 box，只保留媒体数据
      while (offset < segment.length - 8) {
        const boxSize = new DataView(segment.buffer).getUint32(offset);
        const boxType = new TextDecoder().decode(segment.slice(offset + 4, offset + 8));
        
        if (['moof', 'mdat'].includes(boxType)) {
          // 这是媒体数据，保留
          mediaParts.push(segment.slice(offset, offset + boxSize));
        }
        
        offset += boxSize;
        if (boxSize === 0) break;
      }
    }
    
    // 合并所有媒体部分
    const totalLength = mediaParts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(totalLength);
    let currentOffset = 0;
    
    for (const part of mediaParts) {
      result.set(part, currentOffset);
      currentOffset += part.length;
    }
    
    return result;
  }

  // 尝试将 fMP4 转换为 TS（如果需要）
  private async convertfMP4ToTS(): Promise<Uint8Array | null> {
    // 这是一个占位符方法，实际实现会很复杂
    // 对于大多数情况，直接合并应该就足够了
    return null;
  }

  // 从若干片段中提取初始化段（ftyp+moov）
  private extractInitFromArbitrary(segs: Uint8Array[]): Uint8Array | null {
    if (!segs?.length) return null;
    const n = Math.min(5, segs.length);
    for (let i = 0; i < n; i++) {
      const init = this.extractInitializationData(segs[i]);
      if (init && this.containsMoov(init)) return init;
    }
    return null;
  }

  // 修改保存方法
  saveAs(blob: Blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    
    // 根据输出格式确定文件扩展名
    const extension = this.outputFormat;
    
    console.log('保存文件:', {
      outputFormat: this.outputFormat,
      extension,
      filename: `${this.filename}.${extension}`,
      blobSize: blob.size,
      blobType: blob.type
    });
    
    a.download = `${this.filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
  }

  // 公共方法：转换 MP4 为其他格式并下载
  async convertAndDownload(targetFormat: 'webm' | 'avi' | 'mov' | 'mkv', customFilename?: string): Promise<void> {
    if (!this.finishSegments) {
      throw new M3U8DownloaderError("没有可用的片段数据，请先完成下载", "MERGE_ERROR");
    }

    try {
      // 先获取 MP4 数据
      const mp4Data = await this.getMP4Data();
      const mp4Buffer = await mp4Data.arrayBuffer();
      
      // 转换为目标格式
      const convertedData = await this.convertMP4ToOtherFormat(
        new Uint8Array(mp4Buffer), 
        targetFormat
      );
      
      // 创建 Blob 并下载
      const blob = new Blob([new Uint8Array(convertedData)], { type: this.getMimeType(targetFormat) });
      
      // 使用自定义文件名或默认文件名
      const filename = customFilename || this.filename;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}.${targetFormat}`;
      
      console.log(`转换并下载 ${targetFormat.toUpperCase()} 格式:`, {
        originalFormat: 'mp4',
        targetFormat,
        filename: `${filename}.${targetFormat}`,
        size: blob.size
      });
      
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error(`转换并下载 ${targetFormat} 失败:`, (error as Error).message);
      throw error;
    }
  }

  // 获取支持的输出格式列表
  static getSupportedFormats(): string[] {
    return ['mp4', 'webm', 'avi', 'mov', 'mkv', 'ts'];
  }

  // 检查 mediabunny 是否支持特定格式
  static isFormatSupported(format: string): boolean {
    const supportedFormats = M3U8Downloader.getSupportedFormats();
    return supportedFormats.includes(format);
  }

  // 检测音画同步问题并提供修复建议
  async detectSyncIssues(): Promise<{ hasIssues: boolean; issues: string[]; suggestions: string[] }> {
    if (!this.finishSegments) {
      return {
        hasIssues: true,
        issues: ["没有可用的片段数据"],
        suggestions: ["请先完成视频下载"]
      };
    }

    const validation = this.validateAudioVideoSync(this.finishSegments);
    const suggestions: string[] = [];

    if (validation.issues.length > 0) {
      // 根据问题类型提供建议
      for (const issue of validation.issues) {
        if (issue.includes("片段大小差异")) {
          suggestions.push("建议使用 'strict' 同步模式重新转换");
          suggestions.push("检查网络连接是否稳定，可能存在片段下载不完整");
        }
        if (issue.includes("TS 包对齐")) {
          suggestions.push("建议使用 'strict' 或 'compatible' 同步模式");
          suggestions.push("源视频可能存在编码问题，尝试其他视频源");
        }
        if (issue.includes("片段数量太少")) {
          suggestions.push("视频太短或下载不完整，请检查源视频");
        }
      }

      // 根据当前同步模式提供建议
      if (this.syncMode === 'fast') {
        suggestions.push("当前使用快速模式，建议切换到 'compatible' 或 'strict' 模式");
      } else if (this.syncMode === 'compatible') {
        suggestions.push("当前使用兼容模式，如仍有问题可尝试 'strict' 模式");
      }

      // 去重建议
      const uniqueSuggestions = [...new Set(suggestions)];
      
      return {
        hasIssues: true,
        issues: validation.issues,
        suggestions: uniqueSuggestions
      };
    }

    return {
      hasIssues: false,
      issues: [],
      suggestions: ["音画同步检测正常"]
    };
  }

  // 使用指定同步模式重新转换
  async reconvertWithSyncMode(syncMode: 'strict' | 'compatible' | 'fast'): Promise<Blob> {
    if (!this.finishSegments) {
      throw new M3U8DownloaderError("没有可用的片段数据，请先完成下载", "MERGE_ERROR");
    }

    if (this.log) {
      console.log(`使用 ${syncMode} 同步模式重新转换视频`);
    }

    // 临时改变同步模式
    const originalSyncMode = this.syncMode;
    (this as any).syncMode = syncMode;

    try {
      // 重新转换
      const mp4Data = await this.getMP4Data();
      
      // 恢复原始同步模式
      (this as any).syncMode = originalSyncMode;
      
      return mp4Data;
    } catch (error) {
      // 恢复原始同步模式
      (this as any).syncMode = originalSyncMode;
      throw error;
    }
  }

  // 获取同步模式说明
  static getSyncModeDescription(): Record<string, string> {
    return {
      'strict': '严格模式 - 最佳音画同步质量，处理时间较长，适合对同步要求极高的场景',
      'compatible': '兼容模式 - 平衡同步质量和处理速度，适合大多数场景（推荐）',
      'fast': '快速模式 - 优先处理速度，可能有轻微同步问题，适合对速度要求高的场景'
    };
  }

  // 取消下载
  abort(): void {
    this.controller.abort();
  }
}

// 新增：错误码类型与错误类
export type M3U8ErrorCode =
  | "INVALID_URL"
  | "FETCH_ERROR"
  | "PARSE_ERROR"
  | "DOWNLOAD_ERROR"
  | "MERGE_ERROR";

export class M3U8DownloaderError extends Error {
  public code: M3U8ErrorCode;
  constructor(message: string, code: M3U8ErrorCode) {
    super(message);
    this.name = "M3U8DownloaderError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, M3U8DownloaderError);
    }
  }
}
