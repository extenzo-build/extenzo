/*
 * @description: Unified audio creation/management (offscreen vs element) with fallback
 */
import { ActionType, IRollConfig } from "app/types/type.d";
import { sendRuntimeMessage, sendTabMessage } from "app/util";

// 允许的创建类型
export type AudioCreateMode = "stream" | "element";

interface CreateOptions {
  // 期望创建方式
  mode: AudioCreateMode;
  // 失败时是否自动降级/切换到另一种实现
  fallbackOnFail?: boolean;
  // 当前标签页 id
  tabId: number;
  // 最新 rollConfig
  rollConfig: IRollConfig;
}

/**
 * 背景页统一管理音频管线：
 * - offscreen: 使用 chrome.offscreen + tabCapture 获取 streamId 发送给内容脚本
 * - element: 通知内容脚本直接基于 <video> 构建 AudioContext 处理
 *
 * 背景页保存每个 tab 的状态，方便更新 / 重置。
 */
export class AudioCreater {
  private static offscreenStreamMap: Map<number, string> = new Map();
  private static modeMap: Map<number, AudioCreateMode> = new Map();
  private static creatingSet: Set<number> = new Set();

  /**
   * 对外：创建或复用音频环境
   */
  static async create(options: CreateOptions): Promise<AudioCreateMode | null> {
    const { mode, fallbackOnFail, tabId, rollConfig } = options;
    if (this.creatingSet.has(tabId)) return this.modeMap.get(tabId) || null;
    this.creatingSet.add(tabId);
    try {
      if (mode === "stream") {
        const ok = await this.ensureOffscreen(rollConfig).catch(() => false);
        if (ok) return "stream";
        if (fallbackOnFail) {
          const sw = await this.switchToElement(rollConfig).catch(() => null);
          if (sw) return sw;
        }
        // notify popup: completely failed
        sendRuntimeMessage(tabId, {
          type: ActionType.AUDIO_FAILED,
          message: '音频获取失败，请在设置中更换音频获取方式后重试'
        });
        return null;
      } else {
        const ok = await this.ensureElement(rollConfig).catch(() => false);
        if (ok) return "element";
        if (fallbackOnFail) {
          const sw = await this.switchToOffscreen(rollConfig).catch(() => null);
          if (sw) return sw;
        }
        // notify popup: completely failed
        sendRuntimeMessage(tabId, {
          type: ActionType.AUDIO_FAILED,
          message: '音频获取失败，请在设置中更换音频获取方式后重试'
        });
        return null;
      }
    } finally {
      this.creatingSet.delete(tabId);
    }
  }

  /**
   * 更新：依据已记录模式发送对应更新消息；若不存在且允许回退则尝试重新创建。
   */
  static async update(
    tabId: number,
    rollConfig: IRollConfig,
    fallbackOnFail = true
  ) {
    const mode = this.modeMap.get(tabId);
    if (!mode) {
      await this.create({
        mode: "stream",
        fallbackOnFail,
        tabId,
        rollConfig,
      });
      return;
    }

    if (mode === "stream") {
      if (!this.offscreenStreamMap.has(tabId)) {
        // 丢失 streamId，尝试重建
        await this.create({
          mode: "stream",
          fallbackOnFail,
          tabId,
          rollConfig,
        });
        return;
      }
      const streamId = this.offscreenStreamMap.get(tabId);
      sendRuntimeMessage(tabId, {
        type: ActionType.UPDATE_STREAM_AUDIO,
        target: "offscreen",
        streamId,
        rollConfig,
      });
    } else {
      // element 模式直接转发给内容脚本重设
      sendTabMessage(tabId, {
        type: ActionType.UPDATE_ELEMENT_AUDIO,
        tabId,
        rollConfig,
      });
    }
  }

  /**
   * 重置/销毁
   */
  static reset(tabId: number) {
    const mode = this.modeMap.get(tabId);
    if (!mode) return;
    if (mode === "stream") {
      this.offscreenStreamMap.delete(tabId);
      sendRuntimeMessage(tabId, {
        type: ActionType.RESET_AUDIO,
        tabId,
      });
      sendRuntimeMessage(tabId, {
        type: ActionType.DELETE_AUDIO,
        target: "offscreen",
        tabId,
      });
    } else {
      sendRuntimeMessage(tabId, {
        type: ActionType.RESET_AUDIO,
        tabId,
      });
    }
    this.modeMap.delete(tabId);
  }

  static getMode(tabId: number): AudioCreateMode | undefined {
    return this.modeMap.get(tabId);
  }

  /**
   * 切到 element 模式（内容脚本自行处理）
   */
  private static async switchToElement(
    rollConfig: IRollConfig
  ): Promise<AudioCreateMode> {
    this.modeMap.set(rollConfig.tabId, "element");
    sendTabMessage(rollConfig.tabId, {
      type: ActionType.UPDATE_ELEMENT_AUDIO,
      tabId: rollConfig.tabId,
      rollConfig,
    });
    return "element";
  }

  /**
   * 切到 offscreen 模式
   */
  private static async switchToOffscreen(
    rollConfig: IRollConfig
  ): Promise<AudioCreateMode | null> {
    const ok = await this.ensureOffscreen(rollConfig).catch(() => false);
    if (ok) return "stream";
    return null;
  }

  /**
   * 确保 offscreen 已创建并可用
   */
  private static async ensureOffscreen(
    rollConfig: IRollConfig
  ): Promise<boolean> {
    const tabId = rollConfig.tabId;
    try {
      const has = await this.hasOffscreenDocument();
      if (!has) {
        await chrome.offscreen.createDocument({
          url: "offscreen/offscreen.html",
          // @ts-ignore
          reasons: ["USER_MEDIA"],
          justification: "Capture audio for processing",
        });
      }
    } catch (err) {
      console.error("[AudioCreater] create offscreen failed", err);
      return false;
    }

    try {
      const streamId = await this.getStreamId(tabId);
      if (!streamId) throw new Error("no streamId");
      this.offscreenStreamMap.set(tabId, streamId);
      this.modeMap.set(tabId, "stream");
      sendRuntimeMessage(tabId, {
        type: ActionType.UPDATE_STREAM_AUDIO,
        target: "offscreen",
        streamId,
        rollConfig,
      });
      return true;
    } catch (err) {
      console.error("[AudioCreater] getStreamId failed", err);
      return false;
    }
  }

  /**
   * 直接走 element 模式（无需前置创建）
   */
  private static async ensureElement(
    rollConfig: IRollConfig
  ): Promise<boolean> {
    this.modeMap.set(rollConfig.tabId, "element");
    sendTabMessage(rollConfig.tabId, {
      type: ActionType.UPDATE_ELEMENT_AUDIO,
      tabId: rollConfig.tabId,
      rollConfig,
    });
    return true;
  }

  private static async hasOffscreenDocument(): Promise<boolean> {
    try {
      // 某些版本 Manifest V3 提供 getContexts，类型定义可能缺失
      // @ts-ignore
      if (typeof chrome.runtime.getContexts === "function") {
        const offscreenUrl = chrome.runtime.getURL("offscreen/offscreen.html");
        // @ts-ignore
        const contexts: any[] = await chrome.runtime.getContexts({
          // @ts-ignore 强制使用未在类型声明中的 OFFSCREEN_DOCUMENT
          contextTypes: ["OFFSCREEN_DOCUMENT" as any],
          documentUrls: [offscreenUrl],
        });
        return Array.isArray(contexts) && contexts.length > 0;
      }
    } catch (e) {
      // ignore
    }
    return false; // 回退：无法检测则认为不存在
  }

  private static async getStreamId(tabId: number): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        chrome.tabCapture.getMediaStreamId(
          { targetTabId: tabId },
          (streamId) => {
            if (chrome.runtime.lastError) {
              console.error(
                "[AudioCreater] getMediaStreamId error",
                chrome.runtime.lastError.message
              );
              resolve(null);
              return;
            }
            resolve(streamId || null);
          }
        );
      } catch (err) {
        console.error("[AudioCreater] getMediaStreamId exception", err);
        resolve(null);
      }
    });
  }
}

export default AudioCreater;
