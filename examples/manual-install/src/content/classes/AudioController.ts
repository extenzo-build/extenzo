import Audiohacker from "audio-hacker";
import { on } from "events";
import debounce from "lodash-es/debounce";
import { ActionType, IRollConfig } from "src/types/type.d";
import { sendRuntimeMessage } from "src/util";

export type Context = {
  type: "stream" | "element";
  streamId?: string;
  el?: HTMLVideoElement;
};

export default class AudioController {
  audioHacker: Audiohacker | null = null;

  audioCtx: AudioContext | null = null;

  errorEvents: Function[] = [];

  rollConfig: IRollConfig;

  context: Context | undefined;

  tabId: string | number = "";

  private corsZeroMonitorTimer: number | null = null;
  private analyser: AnalyserNode | null = null;
  private elementSourceNode: MediaElementAudioSourceNode | null = null;

  constructor(
    context: Context,
    tabId: number | string,
    rollConfig: IRollConfig,
    onError: Function
  ) {
    this.context = context;
    this.tabId = tabId ?? "";
    this.rollConfig = rollConfig;
    if (typeof onError === "function") {
      this.onError(onError);
    }

    this.setup();
  }

  async setup() {
    try {
      await this.checkInstance();
    } catch (err) {
      console.error(err);
    }
  }

  onError(callback: Function) {
    if (typeof callback === "function") {
      this.errorEvents.push(callback);
    }
  }

  async checkInstance() {
    if (this.context?.type === "stream") {
      if (!this.context?.streamId || this.isBaseValue()) return this;
    }

    if (this.context?.type === "element") {
      if (!this.context?.el || this.isBaseValue()) return this;
    }

    if (!this.audioCtx) {
      await this.createAudioContext();
    }
    return this;
  }

  isBaseValue() {
    if (
      this.rollConfig.muted === false &&
      this.rollConfig.volume === 1 &&
      this.rollConfig.delay === 0 &&
      this.rollConfig.panner === false &&
      this.rollConfig.stereo === 0 &&
      this.rollConfig.pitch.on === false
    ) {
      return true;
    }

    return false;
  }

  async createAudioContext() {
    if (!this.context) return;
    if (this.context.type === "stream" && !this.context.streamId) return;

    if (this.context.type === "element" && !this.context.el) return;

    this.audioCtx = new AudioContext();

    if (this.audioCtx.state !== "running") {
      await this.audioCtx.resume();
    }

    if (this.context.type === "stream") {
      try {
        const tabStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            // 非标准约束，使用 any 规避 TS 校验
            // @ts-ignore
            mandatory: {
              chromeMediaSource: "tab",
              chromeMediaSourceId: this.context.streamId,
            },
          },
        } as any);

        this.createAudiohackerByStream(tabStream);
      } catch (err) {
        this.audioCtx = null;
        console.error("err", err);
        this.errorEvents.forEach((callback) => {
          callback(err, this.tabId);
        });
      }

      return this;
    }

    if (this.context.type === "element") {
      this.createAudiohackerByElement();
    }

    return this;
  }

  createAudiohackerByStream(stream: any) {
    const audioCtx = this.audioCtx as AudioContext;

    if (!audioCtx) return;

    if (this.audioHacker && this.isBaseValue()) {
      this.reset();
      return;
    }

    const node = audioCtx.createMediaStreamSource(stream);
    // Audiohacker 构造函数类型与节点类型可能不完全匹配，这里按运行时可用进行断言
    this.audioHacker = new Audiohacker(audioCtx as any, node as any);
    this.update(this.rollConfig);
  }

  createAudiohackerByElement() {
    const audioCtx = this.audioCtx as AudioContext;

    if (!audioCtx) return;

    if (this.audioHacker && this.isBaseValue()) {
      this.reset();
      return;
    }

    try {
      const video = this.context?.el as HTMLVideoElement | undefined;
      if (!video) return;
      const node = audioCtx.createMediaElementSource(video);
      // 启动 CORS 零输出检测：当跨域不允许时，WebAudio 从 MediaElementAudioSourceNode 输出全 0
      this.startCorsZeroMonitor(video, audioCtx, node);

      this.elementSourceNode = node;
      this.audioHacker = new Audiohacker(audioCtx as any, node as any);

      this.update(this.rollConfig);
    } catch (err) {
      console.error(err);
      this.stopCorsZeroMonitor();
      return;
    }
  }

  private startCorsZeroMonitor(
    video: HTMLVideoElement,
    audioCtx: AudioContext,
    source: MediaElementAudioSourceNode
  ) {
    // 已有监控则先停止
    this.stopCorsZeroMonitor();

    try {
      this.analyser = audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      // 将源节点并联连接到分析器（不连接到输出）
      source.connect(this.analyser);

      const buffer = new Float32Array(this.analyser.fftSize);
      let zeroCount = 0;
      const intervalMs = 250;
      const zeroWindow = Math.ceil(1500 / intervalMs); // 连续 1.5s 判定为静音

      const tick = () => {
        if (!this.analyser) return;
        if (!video || video.paused) {
          zeroCount = 0;
          return;
        }
        this.analyser.getFloatTimeDomainData(buffer);
        // 计算 RMS
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i];
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);

        if (rms < 0.002) {
          zeroCount++;
        } else {
          zeroCount = 0;
        }

        if (zeroCount >= zeroWindow) {
          zeroCount = 0; // 复位，避免刷屏
          try {
            this.stopCorsZeroMonitor();
            console.warn(
              "MediaElementAudioSource outputs zeroes due to CORS access restrictions for",
              video.currentSrc || video.src
            );
            sendRuntimeMessage(this.tabId as number, {
              type: ActionType.AUDIO_FAILED,
              message: "音频获取失败，请在设置中更换音频获取方式后重试",
            });
          } catch {}
        }
      };

      // 使用 window.setInterval 保持计时器句柄类型为 number（TS 兼容）
      this.corsZeroMonitorTimer = window.setInterval(tick, intervalMs);
    } catch (e) {
      // 分析器不可用则忽略
      console.debug("startCorsZeroMonitor error", e);
    }
  }

  private stopCorsZeroMonitor() {
    if (this.corsZeroMonitorTimer) {
      clearInterval(this.corsZeroMonitorTimer);
      this.corsZeroMonitorTimer = null;
    }
    try {
      if (this.elementSourceNode && this.analyser) {
        // 断开并联分析器
        this.elementSourceNode.disconnect(this.analyser);
      }
    } catch {}
    this.analyser = null;
  }

  reset() {
    if (!this.audioHacker) return this;

    this.audioHacker.setPitchOffset(0);
    this.audioHacker.setVolume(1);
    this.audioHacker.setDelay(0);
    this.audioHacker.setPanner(false);
    this.audioHacker.setStereoPanner(0);

    // this.audioHacker.disconnect();
    // this.audioCtx = null;

    // chrome.offscreen.closeDocument();
    this.stopCorsZeroMonitor();
  }

  hasInstance() {
    return Boolean(this.audioHacker);
  }

  update: any = debounce(async (rollConfig: IRollConfig) => {
    // if (streamId) {
    //   this.streamId = streamId;
    // }

    this.rollConfig = rollConfig;

    await this.checkInstance();

    if (!this.audioHacker) return this;

    if (this.isBaseValue()) {
      this.reset();
      return;
    }

    this.audioHacker.setVolume(rollConfig.volume);
    this.audioHacker.setDelay(rollConfig.delay);
    this.audioHacker.setPanner(rollConfig.panner);
    this.audioHacker.setStereoPanner(rollConfig.stereo);

    const { on, value } = rollConfig.pitch;

    try {
      if (!on) {
        // set to 0
        this.audioHacker.setPitchOffset(0);
        return;
      } else {
        this.audioHacker.setPitchOffset(value);
      }
    } catch (err) {
      console.debug(err);
    }
  }, 200);
}
