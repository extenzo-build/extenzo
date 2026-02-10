export interface SummaryOptions {
  context?: string;
  sharedContext?: string;
  length?: "short" | "medium" | "long";
  format?: "text" | "markdown" | "html";
  type?: "key-points" | "summary";
  outputLanguage?: string; // 输出语言
  monitor?: (m: any) => void;
}

export interface SummarizerProgress {
  loaded: number;
  total?: number;
}

export interface SummaryResult {
  text: string;
  metadata?: {
    length: number;
    keywords?: string[];
  };
}

export interface ISummarizer {
  availability(): Promise<"available" | "downloading" | "unavailable">;
  create(options: SummaryOptions): Promise<ISummarizer>;
  summarizeStreaming(
    text: string,
    options: SummaryOptions
  ): Promise<ReadableStream<string>>;
  ready: Promise<void>;
  addEventListener(
    event: string,
    handler: (e: SummarizerProgress) => void
  ): void;
}

// 声明全局 Summarizer API
declare global {
  interface Window {
    Summarizer: {
      availability(): Promise<"available" | "downloadable" | "unavailable">;
      create(options: SummaryOptions): Promise<ISummarizer>;
    };
  }
}

import Summarizer from "@/popup/components/Summarizer";
import { ActionType } from "app/types/type.d";
import { sendRuntimeMessage } from "app/util";

/**
 * Summarizer service for generating summaries from video transcripts
 */
export default class VideoSummarizer {
  private summarizer: ISummarizer | null;
  private isInitialized: boolean;
  private initializationPromise: Promise<void> | null;

  constructor() {
    this.summarizer = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }
  public async checkModel(tabId: number): Promise<void> {
    // 如果已经初始化，直接返回
    if (this.isInitialized) {
      console.log("Summarizer 已初始化，直接返回");
      sendRuntimeMessage(tabId, {
        type: ActionType.SUMMARIZER_AVAILABLE,
        tabId,
      });
      return;
    }

    // 如果正在初始化，等待现有的初始化完成
    if (this.initializationPromise) {
      console.log("Summarizer 正在初始化，等待完成...");
      return this.initializationPromise;
    }

    // 开始新的初始化
    console.log("开始初始化 Summarizer...");
    this.initializationPromise = this.performInitialization(tabId);

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }
  public async downloadModel(
    tabId: number,
    summaryOptions: any = {}
  ): Promise<void> {
    try {
      // 先检查可用性
      // const availability = await Summarizer.availability();
      // console.log("Download model - availability:", availability);

      const options: SummaryOptions = {
        monitor(m) {
          m.addEventListener("downloadprogress", async (e: any) => {
            const progress = e.total
              ? (e.loaded / e.total) * 100
              : e.loaded * 100;
            console.log(
              `Summarizer 模型下载进度: ${progress.toFixed(2)}% (${e.loaded}/${
                e.total || "unknown"
              })`
            );

            if (e.loaded === e.total) {
              const availability = await Summarizer.availability();
              console.log("hhh", availability); 
            }
            sendRuntimeMessage(tabId, {
              type: ActionType.SUMMARIZER_DOWNLOADING,
              tabId,
              payload: {
                progress,
              },
            });
          });
        },
      };

      console.log("开始创建 Summarizer 实例以下载模型...");
      try {
        this.summarizer = await Summarizer.create(options);
        await this.summarizer?.ready;
        console.log("模型下载完成，Summarizer 已就绪");
        sendRuntimeMessage(tabId, {
          type: ActionType.SUMMARIZER_AVAILABLE,
          tabId,
        });
      } catch (error) {
        console.log("---errr", error);
      }

      // if (this.summarizer) {
      //   // 添加多种事件监听器以获得更多信息
      //   this.summarizer.addEventListener("downloadprogress", (e) => {
      //     const progress = e.total
      //       ? (e.loaded / e.total) * 100
      //       : e.loaded * 100;
      //     console.log(
      //       `Summarizer 模型下载进度: ${progress.toFixed(2)}% (${e.loaded}/${
      //         e.total || "unknown"
      //       })`
      //     );
      //     sendRuntimeMessage(tabId, {
      //       type: ActionType.SUMMARIZER_DOWNLOADING,
      //       tabId,
      //       payload: {
      //         progress,
      //       },
      //     });
      //   });

      //   await this.summarizer.ready;
      //   console.log("模型下载完成，Summarizer 已就绪");
      //   this.isInitialized = true;
      //   console.log("Summarizer 服务初始化成功");
      //   sendRuntimeMessage(tabId, {
      //     type: ActionType.SUMMARIZER_AVAILABLE,
      //     tabId,
      //   });
      // } else {
      //   throw new Error("Failed to create summarizer instance");
      // }
    } catch (error) {
      console.error("Download model failed:", error);
      sendRuntimeMessage(tabId, {
        type: ActionType.SUMMARIZER_UNAVAILABLE,
        tabId,
      });
      throw error;
    }
  }
  private async performInitialization(
    tabId: number,
    summaryOptions: any = {}
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!("Summarizer" in window)) {
          console.log("Summarizer API 不可用");
          sendRuntimeMessage(tabId, {
            type: ActionType.SUMMARIZER_UNAVAILABLE,
            tabId,
          });
          reject(new Error("Summarizer API not loaded"));
          return;
        }

        // 首先检查可用性
        const availability = await Summarizer.availability();
        console.log("Summarizer availability:", availability);

        if (availability === "unavailable") {
          console.log("Summarizer API 在此设备上不可用");
          sendRuntimeMessage(tabId, {
            type: ActionType.SUMMARIZER_UNAVAILABLE,
            tabId,
          });
          reject(new Error("Summarizer API unavailable on this device"));
          return;
        }

        const options: SummaryOptions = {
          sharedContext: "This is the subtitle content of a YouTube video. Please summarize it according to the time periods indicated in the brackets [ ]. Before each summary point, mark the corresponding time period",
          format: "markdown",
          length: "long",
          type: "key-points",
          ...summaryOptions,
        };

        console.log("开始创建 Summarizer 实例...");

        if (availability === "available") {
          try {
            this.summarizer = await Summarizer.create(options);
            this.isInitialized = true;
            console.log("Summarizer 服务初始化成功 - 模型已可用");
            sendRuntimeMessage(tabId, {
              type: ActionType.SUMMARIZER_AVAILABLE,
              tabId,
            });
            resolve();
          } catch (createError) {
            console.error("创建 Summarizer 实例失败:", createError);
            // 如果创建失败，可能是设备不支持或其他问题
            sendRuntimeMessage(tabId, {
              type: ActionType.SUMMARIZER_UNAVAILABLE,
              tabId,
            });
            const errorMessage =
              createError instanceof Error
                ? createError.message
                : String(createError);
            reject(new Error(`Failed to create Summarizer: ${errorMessage}`));
          }
          return;
        }

        if (availability === "downloadable") {
          console.log("Summarizer 模型需要下载");
          sendRuntimeMessage(tabId, {
            type: ActionType.SUMMARIZER_DOWNLOADABLE,
            tabId,
          });
          resolve();
          return;
        }

        if (availability === "downloading") {
          console.log("Summarizer 模型正在下载中...");
          sendRuntimeMessage(tabId, {
            type: ActionType.SUMMARIZER_DOWNLOADING,
            tabId,
          });
          resolve();
          return;
        }

        // 处理其他可能的状态
        console.warn("未知的 Summarizer 可用性状态:", availability);
        sendRuntimeMessage(tabId, {
          type: ActionType.SUMMARIZER_UNAVAILABLE,
          tabId,
        });
        reject(new Error(`Unknown availability status: ${availability}`));
      } catch (error) {
        console.log("Summarizer 服务初始化失败:", error);
        this.isInitialized = false;
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to initialize summarizer")
        );
      }
    });
  }

  /**
   * Generate summary from text
   * @param {string} text - The text to summarize
   * @param {SummaryOptions} [options] - Summary options
   * @returns {Promise<string | null>} The generated summary or null if generation fails
   */
  public async generateSummary(
    text: string,
    tabId: number,
    options: Partial<SummaryOptions> = {}
  ): Promise<string | null> {
    if (!text?.trim()) {
      console.log("文本为空，无法生成摘要");
      return null;
    }
    try {
      console.log("开始生成摘要，检查初始化状态...");
      if (!this.isInitialized || !this.summarizer) {
        console.log("Summarizer 未初始化...");
        throw new Error("Summarizer 未初始化");
      }

      console.log("Summarizer 已就绪，开始生成摘要...");
      const summaryOptions: SummaryOptions = {
        context:
          options.context || "This is the subtitle content of a YouTube video. Please summarize it according to the time periods indicated in the brackets [ ]. Before each summary point, mark the corresponding time period.",
        length: options.length || "long",
        format: "markdown",
        type: options.type || "key-points",
      };

      this.summarizer = await Summarizer.create(summaryOptions);

      console.log("调用 summarizeStreaming...", summaryOptions);
      const resultStream = await this.summarizer?.summarizeStreaming(
        text,
        summaryOptions
      );

      console.log("开始处理流式响应...");
      let summary = ""; // 处理流式响应
      const reader = resultStream?.getReader();
      while (true) {
        const { done, value } = await reader?.read() ?? { done: false, value: "" };
        if (done) {
          console.log("流式响应完成");
          break;
        }

        summary += value;

        // 触发进度更新事件
        sendRuntimeMessage(tabId, {
          type: ActionType.SUMMARIZING,
          tabId,
          payload: {
            text: summary,
            complete: false,
          },
        });
      }

      console.log("摘要生成完成，总长度:", summary.length);
      // 触发完成事件
      sendRuntimeMessage(tabId, {
        type: ActionType.SUMMARIZE_DONE,
        tabId,
        payload: {
          text: summary,
          complete: true,
        },
      });

      console.log("摘要生成流程完成");
      return summary;
    } catch (error: any) {
      console.error("生成摘要失败:", error);
      console.log("生成摘要失败:", error);

      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as any).name === "QuotaExceededError"
      ) {
        const e = error as any;
        console.error(
          `Input too large! You tried to summarize ${e.requested} tokens, but only ${e.quota} were available.`
        );

        const message = `Input too large! You tried to summarize ${e.requested} tokens, but only ${e.quota} were available.`;

        sendRuntimeMessage(tabId, {
          type: ActionType.SUMMARIZER_ERROR,
          tabId,
          payload: {
            error: message,
          },
        });
      } else {
        sendRuntimeMessage(tabId, {
          type: ActionType.SUMMARIZER_ERROR,
          tabId,
          payload: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
      return null;
    }
  }

  public async getSubtitleByUrl(url: string, inputSize: number, tabId: number) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const res = await this.parseSubtitleText(data, inputSize, tabId);

    return res;
  }

  public async parseSubtitleText(
    captionData: any,
    inputSize: number,
    tabId: number
  ) {
    if (captionData.events) {
      // 提取所有文本片段（包含时间信息）
      let transcriptText = "";
      let currentStartTime = 0;

      for (const event of captionData.events) {
        // 只处理包含文本的事件
        if (event.segs && event.segs.some((seg: any) => seg.utf8)) {
          // 获取开始时间（毫秒转为秒）
          if (event.tStartMs !== undefined) {
            currentStartTime = Math.floor(event.tStartMs / 1000);
          }

          // 格式化时间为 [MM:SS] 格式
          const minutes = Math.floor(currentStartTime / 60);
          const seconds = currentStartTime % 60;
          const timeStamp = `[${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}] `;

          // 收集这个时间点的所有文本
          let lineText = "";
          for (const seg of event.segs) {
            if (seg.utf8) {
              lineText += seg.utf8;
            }
          }

          if (lineText.trim()) {
            transcriptText += timeStamp + lineText.trim() + "\n";
          }
        }
      }

      const transcript = transcriptText.trim();

      // Apply content filtering
      const filteredTranscript = this.filterSubtitleContent(transcript);

      console.log(
        "处理后的字幕:",
        filteredTranscript.substring(0, 500) + "..."
      );
      console.log(
        `成功提取并过滤字幕，共 ${
          filteredTranscript.length
        } 个字符， 应截取前 ${inputSize ?? 5000} 个字符`
      );

      sendRuntimeMessage(tabId, {
        type: ActionType.GET_SUBTITLE,
        tabId,
        payload: {
          subtitle: filteredTranscript,
        },
      });

      return filteredTranscript.substring(0, inputSize ?? 5000);
    }
  }

  public filterSubtitleContent(text: string): string {
    // Split text into lines
    const lines = text.split("\n");

    // Filter out unwanted lines and clean up the content
    const filteredLines = lines
      .filter((line) => {
        // Skip empty lines
        if (!line.trim()) return false;

        // Extract the content after timestamp
        const content = line.substring(line.indexOf("]") + 1).trim();

        // Filter conditions:
        // 1. Skip lines with only timestamp and brackets content
        // 2. Skip lines with single character content
        // 3. Skip music lyrics (starting with ♪)
        // 4. Skip empty content after timestamp
        return !(
          (
            (content.startsWith("[") && content.endsWith("]")) || // Only brackets content
            content.length === 1 || // Single character
            content.startsWith("♪") || // Music lyrics
            !content
          ) // Empty content
        );
      })
      .map((line) => {
        // Keep timestamp and clean up the content
        const timestamp = line.substring(0, line.indexOf("]") + 1);
        const content = line.substring(line.indexOf("]") + 1).trim();
        return `${timestamp}${content}`;
      });

    // Join filtered lines without newlines, but add space between entries
    // to prevent words from running together
    return filteredLines.join(" ");
  }

  /**
   * Check if the service is initialized
   */
  public isReady(): boolean {
    return this.isInitialized && this.summarizer !== null;
  }

  /**
   * Reset the service state
   */
  public reset(): void {
    this.summarizer = null;
    this.isInitialized = false;
  }
}
