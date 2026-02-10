/*
 * @description: VideoRoll class
 * @Author: Gouxinyu
 * @Date: 2022-05-31 23:27:36
 */
import WEBSITE from "../website";
import * as THREE from "three";
import {
  Flip,
  IMove,
  IFilter,
  Focus,
  FilterUnit,
  IRollConfig,
  FlipType,
  VideoSelector,
  VideoElement,
  OriginElementPosition,
  IRealVideoPlayer,
  VideoListItem,
  ActionType,
  AdvancedPictureInPicture,
  Abloop,
  VideoDownloadListItem,
} from "../types/type.d";
import { nanoid } from "nanoid";
import { isVisible, sendRuntimeMessage } from "app/util";
import debounce from "lodash-es/debounce";
import { getName } from "./utils/getName";
import Recorder from "./classes/Recorder";
import Looper from "./classes/Looper";
import AdSkipper from "./classes/AdSkipper";

import AudioController from "./classes/AudioController";
import Summarizer from "./classes/Summarizer";
import { updateConfig } from "./update";

export default class VideoRoll {
  static rollConfig: IRollConfig;

  static audioController: AudioController | null;

  static videoElements: Set<HTMLVideoElement> = new Set();

  static audioElements: Set<HTMLAudioElement> = new Set();

  static documents: Document[] = [];

  static videoNumbers: number = 0;

  static videoList: VideoListItem[] = [];

  static downloadList: VideoDownloadListItem[] = [];

  static realVideoPlayer: IRealVideoPlayer = {
    width: 0,
    height: 0,
    player: null,
  };

  static originElementPosition: OriginElementPosition | null;

  static observer: MutationObserver | null;

  static eventCallback: Function | null = null;

  static playCallback: Function | null = null;

  static recorder: Recorder;

  static looper: Looper;

  static adSkipper: AdSkipper;

  static summarizer: Summarizer;

  static VrFunctions: any = {};

  // 视频属性监听器
  static playbackRateWatcher: (() => void) | null = null;
  static loopWatcher: (() => void) | null = null;
  static pictureInPictureWatcher: (() => void) | null = null;
  static volumeWatcher: (() => void) | null = null;
  static mutedWatcher: (() => void) | null = null;
  static loopObserver: MutationObserver | null = null;
  static propertiesCheckInterval: number | null = null;

  // 存储视频监听器的引用，以便正确清理
  static videoListeners: Map<
    HTMLVideoElement,
    {
      progressHandler?: Function;
      playHandler?: Function;
    }
  > = new Map();

  /**
   * 清理特定视频的事件监听器
   */
  static clearVideoListeners(video: HTMLVideoElement) {
    const listeners = this.videoListeners.get(video);
    if (listeners) {
      if (listeners.progressHandler) {
        video.removeEventListener(
          "timeupdate",
          listeners.progressHandler as EventListener
        );
      }
      if (listeners.playHandler) {
        video.removeEventListener(
          "play",
          listeners.playHandler as EventListener
        );
      }
      this.videoListeners.delete(video);
    }
  }

  /**
   * 清理所有视频的事件监听器
   */
  static clearAllVideoListeners() {
    this.videoListeners.forEach((listeners, video) => {
      this.clearVideoListeners(video);
    });
    this.videoListeners.clear();
  }

  static setRollConfig(rollConfig: IRollConfig) {
    this.rollConfig = rollConfig;
    return this;
  }

  /**
   * get url host name
   * @returns
   */
  static getHostName(): string {
    // url reg
    const url = window.location.href;
    const urlReg = /^http(s)?:\/\/(.*?)\//;
    const hostName = urlReg.exec(url)?.[2] ?? "";

    return hostName;
  }

  /**
   * 计算视频缩放比例
   * @param dom
   * @param deg
   * @returns
   */
  static getScaleNumber(
    target: HTMLVideoElement,
    deg: number
  ): [number, number] {
    const offsetWidth = target.offsetWidth ?? 0;
    const offsetHeight = target.offsetHeight ?? 0;
    const videoWidth = target.videoWidth ?? 0;
    const videoHeight = target.videoHeight ?? 0;

    const isHorizonDeg = deg === 90 || deg === 270;

    // 根据原始视频的宽高比例，和容器的宽高比例，计算缩放比例
    const isHorizonVideo = videoWidth > videoHeight;
    const isHorizonDom = offsetWidth > offsetHeight;

    // 判断旋转后的缩放比例
    // 1.若是竖屏视频，但在横屏容器中，初始就是等比缩小的
    if (isHorizonDeg && !isHorizonVideo && isHorizonDom) {
      const scale = offsetWidth / offsetHeight;
      // if video element is shadowdom, cant get video height;
      return Number.isNaN(scale) ? [1, 1] : [scale, scale];
    }

    // 2.若是竖屏视频，横屏中，旋转回0或180
    if (!isHorizonDeg && !isHorizonVideo && isHorizonDom) {
      return [1, 1];
    }

    // 3.若是横屏视频，处在横屏容器中
    if (isHorizonDeg && isHorizonVideo && isHorizonDom) {
      const value = offsetHeight / offsetWidth;
      return Number.isNaN(value) ? [1, 1] : [value, value];
    }

    if (!isHorizonDeg && isHorizonVideo && isHorizonDom) {
      return [1, 1];
    }

    // 若是竖屏且容器为竖屏
    if (!isHorizonVideo && !isHorizonDom && isHorizonDeg) {
      const value = videoWidth / videoHeight;
      return Number.isNaN(value) ? [1, 1] : [value, value];
    }

    return [1, 1];
  }

  /**
   * get all documnets includes iframes
   */
  static updateDocuments() {
    const iframes = document.querySelectorAll("iframe") ?? [];
    const iframeEls: HTMLIFrameElement[] = Array.from(iframes).filter(
      (v) => v.contentDocument
    );

    this.setRollConfig({
      ...this.rollConfig,
      iframes: Array.from(iframes).map((v) => v.src),
    });

    this.documents = [
      document,
      ...iframeEls
        .map((v) => {
          if (v.contentDocument) {
            // @ts-ignore
            v.contentDocument.iframeElement = v;
          }
          return v.contentDocument as Document;
        })
        .filter((v) => v.querySelectorAll("video").length > 0),
    ];

    return this;
  }

  /**
   * get all video elements
   */
  static updateVideoElements(videoSelector: VideoSelector) {
    if (!this.documents.length) return;

    this.addMaskElement();
    this.addVrMaskElement();
    this.addPipMaskElement();
    // this.clearOriginElementPosition();
    this.clearRealVideoPlayer();
    const videos = this.getAllVideosBySelector(videoSelector, this.documents);

    this.setVideo(videos);

    const mask = document.getElementById("video-roll-root-mask");
    if (
      !this.realVideoPlayer.player ||
      this.realVideoPlayer.player?.parentElement === mask
    )
      return;

    if (this.rollConfig.advancedPictureInPicture?.on) return this;

    const originElementPosition = this.findOriginElementPosition(
      this.realVideoPlayer.player as HTMLVideoElement
    );
    this.setOriginElementPosition(originElementPosition);
    return this;
  }

  static updateVideoNumbers(videoSelector: VideoSelector) {
    if (!this.documents.length) return;

    const videos = this.getAllVideosBySelector(videoSelector, this.documents);

    this.setVideo(videos);
    return this;
  }

  static getSourceElementSrc(video: HTMLVideoElement) {
    if (!video.src) {
      // twitch has no src
      const src = video.querySelector("source")?.src ?? "no-src";
      return src;
    }
    return video.src;
  }

  static getAllVideosBySelector(
    videoSelector: VideoSelector,
    docs: Document[] | HTMLIFrameElement[]
  ): HTMLVideoElement[] {
    const { defaultDom } = videoSelector;
    const videos: HTMLVideoElement[] = [];
    if (defaultDom) {
      docs.forEach((doc) => {
        const defaultElements: NodeListOf<HTMLVideoElement> =
          doc.querySelectorAll(defaultDom);
        const elements = Array.from(defaultElements).filter((element) =>
          this.getSourceElementSrc(element)
        );

        for (const video of elements) {
          // @ts-ignore
          video.parentDocument = doc;

          if (video.dataset.rollId) {
            continue;
          }

          video.setAttribute("data-roll-id", `${nanoid()}`);
          video.setAttribute("data-roll-check", "true");
        }

        videos.push(...elements);
      });
    }

    return videos;
  }

  /**
   * set videoElements
   * @param videoSelector
   * @param doc
   * @returns
   */
  static setVideo(videos: HTMLVideoElement[]) {
    // 清理被移除视频的监听器
    this.videoElements.forEach((item) => {
      // @ts-ignore
      if (!videos.some((v) => v === item)) {
        // 清理被移除视频的事件监听器
        this.clearVideoListeners(item);
        this.videoElements.delete(item);
      }
    });

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      if (i === 0) {
        this.setRealVideoPlayer(video);
      } else if (this.isRealVideoPlayer(video)) {
        this.setRealVideoPlayer(video);
      }

      if (this.videoElements.has(video)) continue;

      this.videoElements.add(video);
    }

    this.setVideoNumbers();
  }

  static setVideoNumbers(): void {
    this.videoNumbers = this.videoElements.size;
  }

  static setOriginElementPosition(data: any) {
    this.originElementPosition = data;
  }

  static setRealVideoPlayer(realPlayer: HTMLVideoElement) {
    // 如果有旧的 realVideoPlayer，先清理它的监听器
    if (
      this.realVideoPlayer.player &&
      this.realVideoPlayer.player !== realPlayer
    ) {
      this.removeVideoPropertiesWatcher();
      // 清理旧 realVideoPlayer 的自定义监听器
      this.clearVideoListeners(this.realVideoPlayer.player);
    }

    this.realVideoPlayer = {
      width: realPlayer.offsetWidth,
      height: realPlayer.offsetHeight,
      player: realPlayer,
    };

    // 设置新的监听器
    this.setupVideoPropertiesWatcher();
  }

  /**
   * clear all cache
   */
  static clearVideoElements() {
    // 清理所有视频的事件监听器
    this.clearAllVideoListeners();
    this.videoElements.clear();
  }

  static clearOriginElementPosition() {
    this.originElementPosition = null;
  }

  static clearRealVideoPlayer() {
    // 清理 realVideoPlayer 的监听器
    if (this.realVideoPlayer.player) {
      this.removeVideoPropertiesWatcher();
      this.clearVideoListeners(this.realVideoPlayer.player);
    }

    this.realVideoPlayer = { width: 0, height: 0, player: null };
  }

  static isRealVideoPlayer(player: HTMLVideoElement): boolean {
    const isSmaller =
      player.offsetWidth < this.realVideoPlayer.width ||
      player.offsetHeight < this.realVideoPlayer.height;

    if (
      this.realVideoPlayer.player &&
      this.realVideoPlayer.player.currentTime === 0 &&
      this.realVideoPlayer.player.paused &&
      player.currentTime > 0 &&
      !player.paused
    ) {
      return true;
    }

    if (
      !player.paused &&
      !player.ended &&
      player.readyState > 0 &&
      player.currentTime > 0
    ) {
      return true;
    }

    if ("readyState" in player && player.readyState === 0) return false;

    if (player.paused && player.currentTime === 0) return false;

    // this may be ads video player
    if (player.muted && player.loop && isSmaller) return false;

    if (isSmaller && player.readyState === 0) return false;

    if (player.loop && isSmaller) return false;

    if (isSmaller) return false;

    return true;
  }

  /**
   * set video rotate deg
   * @param rollConfig
   * @returns
   */
  static updateVideo(rollConfig: IRollConfig) {
    const {
      deg,
      flip,
      scale,
      zoom,
      move,
      filter,
      focus,
      pictureInPicture,
      vr,
      advancedPictureInPicture,
      abLoop,
      playbackRate
    } = rollConfig;

    const videos = this.videoElements.values();

    if (this.videoElements.size === 0) {
      console.debug("VideoRoll: No video elements found.");
      this.setRollConfig(rollConfig);
      return this;
    }

    for (const target of videos) {
      if (target.dataset.rollCheck === "false") {
        target.classList.remove("video-roll-deg-scale");
        target.setAttribute("data-roll", "false");
        this.toggleLoop(target, false);
        continue;
      }

      const dom = target;
      let scaleNum: [number, number] = this.rollConfig.scale.values;

      if (
        JSON.stringify(rollConfig.scale.values) ===
        JSON.stringify(this.rollConfig.scale.values)
      ) {
        if (rollConfig.isAutoChangeSize) {
          scaleNum = rollConfig.isInit
            ? scale.values
            : this.getScaleNumber(target, deg);
          rollConfig.scale.values = scaleNum;
        }
      }

      this.setRollConfig(rollConfig);

      this.rollConfig.document = { title: document.title };
      this.documents.forEach((doc) => {
        if (!this.isExistStyle(doc)) return;
        this.replaceClass(
          { deg, flip, scale: scaleNum, zoom, move, filter, focus },
          doc
        );
      });

      dom.classList.add("video-roll-deg-scale");
      dom.setAttribute("data-roll", "true");

      this.toggleLoop(dom, rollConfig.loop);
    }

    this.updateFocus(this.realVideoPlayer.player as HTMLVideoElement, focus);
    this.togglePictureInPicture(pictureInPicture);
    this.updateLoop(abLoop);
    this.updateVr(this.realVideoPlayer.player as HTMLVideoElement, vr);
    this.updatePlaybackRate(playbackRate);

    this.updateAdvancedPictureInPicture(
      this.realVideoPlayer.player as HTMLVideoElement,
      advancedPictureInPicture
    );
    return this;
  }

  static createAudioCapture(streamId: string) {
    if (!this.rollConfig) return;

    sendRuntimeMessage(this.rollConfig.tabId, {
      type: ActionType.AUDIO_CAPTURE,
      streamId,
      rollConfig: this.rollConfig,
    });
  }

  /**
   * update audio
   */
  static async updateAudio() {
    sendRuntimeMessage(this.rollConfig.tabId, {
      type: ActionType.UPDATE_AUDIO,
      rollConfig: this.rollConfig,
    });

    return this;
  }

  static resetAudio() {
    if (this.audioController) {
      this.audioController.reset();
    } else {
      sendRuntimeMessage(this.rollConfig.tabId, {
        type: ActionType.DELETE_AUDIO,
        target: "offscreen",
        tabId: this.rollConfig.tabId,
      });
    }
  }

  static getFilterStyle(filter: IFilter) {
    let filterStyle = "";

    Object.keys(filter)
      .filter((type) => type !== "mode")
      .forEach((type: string) => {
        filterStyle += ` ${type}(${filter[type as keyof IFilter]}${
          (FilterUnit as any)[type]
        })`;
      });

    return filterStyle;
  }

  /**
   * change class content
   * @param deg
   * @param scaleNum
   */
  static replaceClass(
    rollConfig: {
      deg: number;
      flip: Flip;
      scale: [number, number];
      zoom: number;
      move: IMove;
      filter: IFilter;
      focus: Focus;
    },
    doc = document
  ) {
    const { deg, flip, scale, zoom, move, filter, focus } = rollConfig;
    const degScale = doc.getElementById("video-roll-deg-scale") as HTMLElement;

    const filterStyle =
      filter.mode === "custom" ? this.getFilterStyle(filter) : filter.mode;

    const translateStyle =
      Number(move.x) !== 0 || Number(move.y) !== 0
        ? `translate(${move.x}%, ${-move.y}%)`
        : "";
    const scaleStyle = scale.some((v) => Number(v) !== 1)
      ? `scale(${scale[0]}, ${scale[1]})`
      : "";
    const zoomStyle = Number(zoom) !== 1 ? `scale3d(${zoom}, ${zoom}, 1)` : "";

    degScale.innerHTML = `.video-roll-deg-scale { 
            transform: ${FlipType[flip]} rotate(${deg}deg) ${zoomStyle} ${scaleStyle} ${translateStyle} !important; 
            filter: ${filterStyle}; 
        }
        `;

    return this;
  }

  /**
   * 是否存在class
   * @returns
   */
  static isExistStyle(doc: Document) {
    const degScale = doc.getElementById("video-roll-deg-scale");
    const focusStyle = doc.getElementById("video-roll-focus-style");
    const vrStyle = doc.getElementById("video-roll-vr-style");
    const pictureInPictureStyle = doc.getElementById("video-roll-pip-style");

    return (degScale && focusStyle && vrStyle && pictureInPictureStyle) || null;
  }

  /**
   * get video dom selector
   * @param hostName
   * @returns
   */
  static getVideoSelector(hostName: string) {
    let videoSelector = {
      defaultDom: "video",
    };

    if (!hostName) {
      return videoSelector;
    }

    for (const key of Object.keys(WEBSITE)) {
      if (hostName.includes(key)) {
        const target = WEBSITE[key];
        videoSelector = target.videoSelector;
        return videoSelector;
      }
    }

    return videoSelector;
  }

  /**
   * get roll config
   * @returns
   */
  static getRollConfig() {
    return this.rollConfig;
  }

  /**
   * add style
   * @returns
   */
  static addStyleClass(isClear: boolean = false) {
    const { storeThisTab, store } = this.getRollConfig();

    for (const doc of this.documents) {
      const styles = this.isExistStyle(doc);

      if (styles) {
        if (!isClear) return this;

        if (!storeThisTab && !store) {
          styles.innerHTML = `
                    .video-roll-deg-scale {}
                `;
          return this;
        }

        return this;
      }

      const degScale = doc.createElement("style");
      degScale.innerHTML = `
                .video-roll-deg-scale {}
            `;

      degScale.setAttribute("id", "video-roll-deg-scale");
      degScale.setAttribute("type", "text/css");

      const focusStyle = doc.createElement("style");
      focusStyle.innerHTML = ``;
      focusStyle.setAttribute("id", "video-roll-focus-style");
      focusStyle.setAttribute("type", "text/css");

      const vrStyle = doc.createElement("style");
      vrStyle.innerHTML = ``;
      vrStyle.setAttribute("id", "video-roll-vr-style");
      vrStyle.setAttribute("type", "text/css");

      const pictureInPictureStyle = doc.createElement("style");
      pictureInPictureStyle.innerHTML = ``;
      pictureInPictureStyle.setAttribute("id", "video-roll-pip-style");
      pictureInPictureStyle.setAttribute("type", "text/css");

      const overflowHidden = doc.createElement("style");
      overflowHidden.innerHTML = `.video-roll-overflow-hidden { overflow: hidden !important; }`;
      overflowHidden.setAttribute("id", "video-roll-overflow-hidden");

      const head = doc.getElementsByTagName("head")[0];

      if (head) {
        head.appendChild(degScale);
        head.appendChild(focusStyle);
        head.appendChild(vrStyle);
        head.appendChild(pictureInPictureStyle);
        head.appendChild(overflowHidden);
      }

      this.addMaskElement();
      this.addVrMaskElement();
      this.addPipMaskElement();
    }

    // if (storeThisTab) {
    //     this.updateVideo(this.rollConfig);
    // }

    return this;
  }

  /**
   * add mask element(for focus mode)
   */
  static addMaskElement() {
    if (!document.body) return;

    if (!document.getElementById("video-roll-root-mask")) {
      const mask = document.createElement("div");
      mask.setAttribute("id", "video-roll-root-mask");
      document.body.appendChild(mask);
    }
  }

  static showBackToTab = () => {
    const backToTab = document.getElementById("video-roll-backToTab");

    if (backToTab) {
      // 显示按钮
      backToTab.style.display = "block";

      // 设置1秒后隐藏的定时器
      VideoRoll.clearBackToTabTimer.set(() => {
        backToTab.style.display = "none";
      }, 600);
    }
  };

  static backToTab = () => {
    sendRuntimeMessage(this.rollConfig.tabId, {
      type: ActionType.BACK_TO_TAB,
      rollConfig: this.rollConfig,
    });
  };

  static addPipMaskElement() {
    if (!document.body) return;

    if (!document.getElementById("video-roll-pip-mask")) {
      const mask = document.createElement("div");
      mask.setAttribute("id", "video-roll-pip-mask");
      mask.innerHTML = `<div id="video-roll-backToTab" style="display: none; position: absolute; left: 0; right: 0;
            top:0; bottom:0; margin: auto; width: 20%; height: 30px; background-color: #a494c6; opacity: 0.8;
            border-radius: 5px; color: #fff; text-align: center; line-height: 30px; z-index: 1; cursor: pointer;">
                back to tab
            </div>`;
      document.body.appendChild(mask);

      mask.removeEventListener("mousemove", this.showBackToTab);
      mask.addEventListener("mousemove", this.showBackToTab);

      const backToTab = document.getElementById("video-roll-backToTab");
      backToTab?.removeEventListener("click", this.backToTab);
      backToTab?.addEventListener("click", this.backToTab);
    }
  }

  static addVrMaskElement() {
    if (!document.body) return;

    if (!document.getElementById("video-roll-vr-mask")) {
      const mask = document.createElement("div");
      mask.setAttribute("id", "video-roll-vr-mask");
      document.body.appendChild(mask);
    }
  }

  /**
   * find the video's root wrapper element
   * @param dom
   * @param rect
   * @returns
   */
  static findOriginElementPosition(video: HTMLVideoElement): any {
    const { parentElement, previousElementSibling, nextElementSibling } = video;
    return {
      parentElement,
      previousElementSibling,
      nextElementSibling,
      style: {
        width: video.offsetWidth,
        height: video.offsetHeight,
      },
    };
  }

  /**
   * update focus mode
   * @param doc
   * @param video
   * @param focus
   * @returns
   */
  static updateFocus(video: HTMLVideoElement, focus: Focus) {
    const mask = document.getElementById("video-roll-root-mask");
    const focusStyle = document.getElementById(
      "video-roll-focus-style"
    ) as HTMLStyleElement;

    if (focusStyle) {
      focusStyle.innerHTML = `#video-roll-root-mask {
                display: ${focus.on ? "block" : "none"};
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                backdrop-filter: ${focus.blur ? "blur(10px)" : "unset"};
                z-index: 20000 !important;
                background-color: ${focus.backgroundColor};
            }
            
            .video-roll-focus {
                width: ${this.originElementPosition?.style.width}px;
                height: ${this.originElementPosition?.style.height}px;
                position: absolute;
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                margin: auto;
                border-radius: ${focus.rounded ? "10px" : "unset"}
            }`;
    }

    if (!video) return this;

    if (!focus.on && this.originElementPosition && mask) {
      const { parentElement, nextElementSibling } = this.originElementPosition;
      if (video.parentElement === mask && parentElement) {
        video.classList.remove("video-roll-focus");
        if (video.classList.contains("video-roll-no-controls")) {
          video.classList.remove("video-roll-no-controls");
          video.controls = false;
        }

        if (nextElementSibling) {
          parentElement.insertBefore(video, nextElementSibling);
        } else {
          parentElement.appendChild(video);
        }
      }

      return this;
    }

    if (focus.on && this.originElementPosition && mask) {
      mask.appendChild(video);
      video.classList.add("video-roll-focus");

      if (!video.controls) {
        video.classList.add("video-roll-no-controls");
        video.controls = true;
      }
    }

    return this;
  }

  static updateAdvancedPictureInPicture(
    video: HTMLVideoElement,
    advancedPictureInPicture: AdvancedPictureInPicture
  ) {
    const mask = document.getElementById("video-roll-pip-mask");
    const pipStyle = document.getElementById(
      "video-roll-pip-style"
    ) as HTMLStyleElement;

    if (pipStyle) {
      pipStyle.innerHTML = `#video-roll-pip-mask {
                display: ${advancedPictureInPicture.on ? "block" : "none"};
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                z-index: 20000 !important;
                background-color: #000;
            }
            
            .video-roll-pip {
                width: 100% !important;
                height: 100% !important;
                position: absolute;
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                margin: auto;
            }`;
    }

    if (!video) return this;

    if (!advancedPictureInPicture.on && this.originElementPosition && mask) {
      const { parentElement, nextElementSibling } = this.originElementPosition;

      // 清理backToTab定时器
      this.clearBackToTabTimer.clear();

      document.body.classList.remove("video-roll-overflow-hidden");
      if (video.parentElement === mask && parentElement) {
        video.classList.remove("video-roll-pip");
        if (video.classList.contains("video-roll-no-controls")) {
          video.classList.remove("video-roll-no-controls");
          video.controls = false;
        }

        if (nextElementSibling) {
          parentElement.insertBefore(video, nextElementSibling);
        } else {
          parentElement.appendChild(video);
        }
      }

      return this;
    }

    if (advancedPictureInPicture.on && this.originElementPosition && mask) {
      mask.appendChild(video);
      video.classList.add("video-roll-pip");
      document.body.classList.add("video-roll-overflow-hidden");
      if (!video.controls) {
        video.classList.add("video-roll-no-controls");
        video.controls = true;
      }
    }

    return this;
  }

  static updateVr(video: HTMLVideoElement, vr: any) {
    const mask = document.getElementById("video-roll-vr-mask");
    const vrStyle = document.getElementById(
      "video-roll-vr-style"
    ) as HTMLStyleElement;

    if (vrStyle) {
      vrStyle.innerHTML = `#video-roll-vr-mask {
                display: ${vr.on ? "block" : "none"};
                position: absolute; /* 默认跟随视频大小定位，进入全屏时添加 vr-fullscreen 类 */
                z-index: 20000 !important;
            }
            #video-roll-vr-mask.vr-fullscreen {
                position: fixed;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: #000 !important;
            }
            
            .video-roll-focus {
                width: ${this.originElementPosition?.style.width}px;
                height: ${this.originElementPosition?.style.height}px;
                position: absolute;
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                margin: auto;
            }
            
            .video-roll-vr-controls {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.5);
                padding: 10px;
                border-radius: 5px;
                display: flex;
                gap: 10px;
                z-index: 20001;
                opacity: 1;
                transition: opacity 0.3s ease;
            }
            
            .video-roll-vr-controls.hidden {
                opacity: 0;
            }
            
            .video-roll-vr-controls button {
                padding: 8px 15px;
                background: #7367f0;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
            }
            
            .video-roll-vr-controls button:hover {
                background: #7367f0;
            }
            
            .video-roll-vr-progress {
                position: absolute;
                bottom: 90px;
                left: 50%;
                transform: translateX(-50%);
                width: 80%;
                height: 10px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 5px;
                overflow: hidden;
                cursor: pointer;
                z-index: 20001;
                opacity: 1;
                transition: opacity 0.3s ease;
            }
            
            .video-roll-vr-progress:hover {
                height: 15px;
                background: rgba(255, 255, 255, 0.5);
            }
            
            .video-roll-vr-progress.hidden {
                opacity: 0;
            }
            
            .video-roll-vr-progress-bar {
                height: 100%;
                background: #7367f0;
                width: 0%;
            }
            
            .video-roll-vr-time {
                position: absolute;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                color: white;
                font-size: 14px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                z-index: 20001;
                opacity: 1;
                transition: opacity 0.3s ease;
            }
            
            .video-roll-vr-time.hidden {
                opacity: 0;
            }
            
            .video-roll-vr-hover-time {
                position: absolute;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                pointer-events: none;
                z-index: 20002;
                display: none;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            .video-roll-vr-guide {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                text-align: center;
                z-index: 20003;
                opacity: 0;
                transition: opacity 0.5s ease;
                pointer-events: none;
                user-select: none;
            }
            
            .video-roll-vr-guide.visible {
                opacity: 1;
            }
            
            .video-roll-vr-arrows {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 40px;
                margin-bottom: 20px;
            }
            
            .video-roll-vr-arrow {
                font-size: 48px;
                color: #7367f0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                filter: drop-shadow(0 0 10px rgba(115, 103, 240, 0.6));
                animation: blinkArrow 2s infinite ease-in-out;
            }
            
            .video-roll-vr-arrow:first-child {
                animation-delay: 0s;
            }
            
            .video-roll-vr-arrow:last-child {
                animation-delay: 1s;
            }
            
            @keyframes blinkArrow {
                0%, 50%, 100% {
                    opacity: 1;
                    transform: scale(1);
                }
                25% {
                    opacity: 0.3;
                    transform: scale(1.3);
                }
                75% {
                    opacity: 0.6;
                    transform: scale(1.1);
                }
            }
            
            .video-roll-vr-guide-text {
                font-size: 18px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                background: rgba(0, 0, 0, 0.5);
                padding: 10px 20px;
                border-radius: 10px;
                backdrop-filter: blur(5px);
            }
            
            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                    opacity: 0.8;
                }
                50% {
                    transform: scale(1.1);
                    opacity: 1;
                }
            }`;
    }

    if (!video) return this;

    if (!vr.on && mask && this.VrFunctions.onPointerDown) {
      const dom = document.getElementById("video-roll-vr");
      const controls = document.getElementById("video-roll-vr-controls");
      const progress = document.getElementById("video-roll-vr-progress");
      const timeDisplay = document.getElementById("video-roll-vr-time");
      const hoverTimeDisplay = document.getElementById(
        "video-roll-vr-hover-time"
      );
      const vrGuide = document.getElementById("video-roll-vr-guide");
      // 恢复原始视频可见性
      if (video && video.dataset.vrHidden === "true") {
        video.style.visibility = "";
        delete video.dataset.vrHidden;
      }

      // 如果当前是全屏，先移除全屏状态
      if (mask.classList.contains("vr-fullscreen")) {
        mask.classList.remove("vr-fullscreen");
      }
      // 清理遮罩定位样式（left/top/width/height/backgroundColor），避免下次直接保持旧尺寸
      mask.removeAttribute("style");
      mask.setAttribute("id", "video-roll-vr-mask"); // 再确保 id 仍在
      // 注意：display 由样式表控制

      // 重置内部状态标志
      if (
        this.VrFunctions &&
        typeof this.VrFunctions.isFullscreen !== "undefined"
      ) {
        this.VrFunctions.isFullscreen = false;
      }

      // 移除事件监听器
      document.removeEventListener("mousedown", this.VrFunctions.onPointerDown);
      document.removeEventListener("mousemove", this.VrFunctions.onPointerMove);
      document.removeEventListener("mouseup", this.VrFunctions.onPointerUp);

      document.removeEventListener(
        "touchstart",
        this.VrFunctions.onPointerDown
      );
      document.removeEventListener("touchmove", this.VrFunctions.onPointerMove);
      document.removeEventListener("touchend", this.VrFunctions.onPointerUp);

      window.removeEventListener("resize", this.VrFunctions.onWindowResize);

      // 移除mask上的事件监听
      if (mask) {
        mask.removeEventListener("mousemove", this.VrFunctions.handleMouseMove);
        mask.removeEventListener("touchmove", this.VrFunctions.showControls);
      }

      // 移除进度条相关的事件监听器
      if (progress) {
        if (this.VrFunctions.progressClickHandler) {
          progress.removeEventListener(
            "click",
            this.VrFunctions.progressClickHandler
          );
        }
        if (this.VrFunctions.progressMoveHandler) {
          progress.removeEventListener(
            "mousemove",
            this.VrFunctions.progressMoveHandler
          );
        }
        if (this.VrFunctions.progressLeaveHandler) {
          progress.removeEventListener(
            "mouseleave",
            this.VrFunctions.progressLeaveHandler
          );
        }
      }

      // 移除窗口/滚动事件监听
      window.removeEventListener("resize", this.VrFunctions.updateMaskPosition);
      window.removeEventListener(
        "scroll",
        this.VrFunctions.updateMaskPosition,
        true
      );

      // 移除DOM元素
      dom?.remove();
      controls?.remove();
      progress?.remove();
      timeDisplay?.remove();
      hoverTimeDisplay?.remove();
      vrGuide?.remove();

      this.VrFunctions = {};
      return this;
    }

    if (vr.on && mask) {
      const dom = document.getElementById("video-roll-vr");

      if (dom) {
        return this;
      }

      // 创建Canvas元素
      const canvas = document.createElement("canvas");
      mask.appendChild(canvas);
      canvas.width = video.offsetWidth * devicePixelRatio;
      canvas.height = video.offsetHeight * devicePixelRatio;
      canvas.setAttribute("id", "video-roll-vr");

      // 创建控制UI
      const controls = document.createElement("div");
      controls.setAttribute("id", "video-roll-vr-controls");
      controls.className = "video-roll-vr-controls";
      mask.appendChild(controls);

      // 播放/暂停按钮
      const playPauseBtn = document.createElement("button");
      playPauseBtn.textContent = video.paused ? "Play" : "Pause";
      playPauseBtn.onclick = () => {
        if (video.paused) {
          video.play();
          playPauseBtn.textContent = "Pause";
        } else {
          video.pause();
          playPauseBtn.textContent = "Play";
        }
      };
      controls.appendChild(playPauseBtn);

      // 退出VR模式按钮
      const exitBtn = document.createElement("button");
      exitBtn.textContent = "Exit";
      exitBtn.onclick = () => {
        this.rollConfig.vr.on = false;
        this.updateVr(video, this.rollConfig.vr);
        updateConfig(this.rollConfig.tabId, this.rollConfig);
      };
      controls.appendChild(exitBtn);

      // 重置视角按钮
      const resetBtn = document.createElement("button");
      resetBtn.textContent = "Reset";
      resetBtn.onclick = () => {
        lon = -90; // 重置到左眼画面中央
        lat = 0;
      };
      controls.appendChild(resetBtn);

      // 全屏按钮
      const fullscreenBtn = document.createElement("button");
      fullscreenBtn.textContent = "Fullscreen";
      controls.appendChild(fullscreenBtn);

      // 创建进度条
      const progress = document.createElement("div");
      progress.setAttribute("id", "video-roll-vr-progress");
      progress.className = "video-roll-vr-progress";
      mask.appendChild(progress);

      const progressBar = document.createElement("div");
      progressBar.className = "video-roll-vr-progress-bar";
      progress.appendChild(progressBar);

      // 创建时间显示
      const timeDisplay = document.createElement("div");
      timeDisplay.setAttribute("id", "video-roll-vr-time");
      timeDisplay.className = "video-roll-vr-time";
      mask.appendChild(timeDisplay);

      // 创建悬停时间提示
      const hoverTimeDisplay = document.createElement("div");
      hoverTimeDisplay.setAttribute("id", "video-roll-vr-hover-time");
      hoverTimeDisplay.className = "video-roll-vr-hover-time";
      mask.appendChild(hoverTimeDisplay);

      // 创建VR引导提示
      const vrGuide = document.createElement("div");
      vrGuide.setAttribute("id", "video-roll-vr-guide");
      vrGuide.className = "video-roll-vr-guide";
      vrGuide.innerHTML = `
        <div class="video-roll-vr-arrows">
          <span class="video-roll-vr-arrow">←</span>
          <span class="video-roll-vr-arrow">→</span>
        </div>
        <div class="video-roll-vr-guide-text">Drag to move the view</div>
      `;
      mask.appendChild(vrGuide);

      // 格式化时间函数
      const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${
          remainingSeconds < 10 ? "0" : ""
        }${remainingSeconds}`;
      };

      // 更新进度条和时间显示
      const updateProgressBar = () => {
        if (!video.paused || true) {
          // 即使暂停也更新一次
          const percent = (video.currentTime / video.duration) * 100;
          progressBar.style.width = `${percent}%`;

          // 更新时间显示
          const currentTime = formatTime(video.currentTime);
          const totalTime = formatTime(video.duration);
          timeDisplay.textContent = `${currentTime} / ${totalTime}`;
        }
        requestAnimationFrame(updateProgressBar);
      };
      updateProgressBar();

      // 进度条拖拽功能
      this.VrFunctions.progressClickHandler = (e: MouseEvent) => {
        const rect = progress.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
      };
      progress.addEventListener("click", this.VrFunctions.progressClickHandler);

      // 进度条悬停显示时间功能
      this.VrFunctions.progressMoveHandler = (e: MouseEvent) => {
        const rect = progress.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const hoverTime = pos * video.duration;

        // 更新悬停时间显示
        hoverTimeDisplay.textContent = formatTime(hoverTime);
        hoverTimeDisplay.style.display = "block";

        // 计算悬停时间显示的位置，跟随鼠标
        const hoverTimeRect = hoverTimeDisplay.getBoundingClientRect();
        const leftPos = e.clientX - hoverTimeRect.width / 2;
        const topPos = rect.top - hoverTimeRect.height - 5; // 在进度条上方5px处显示

        hoverTimeDisplay.style.left = `${leftPos}px`;
        hoverTimeDisplay.style.top = `${topPos}px`;
      };
      progress.addEventListener(
        "mousemove",
        this.VrFunctions.progressMoveHandler
      );

      // 鼠标离开进度条时隐藏悬停时间
      this.VrFunctions.progressLeaveHandler = () => {
        hoverTimeDisplay.style.display = "none";
      };
      progress.addEventListener(
        "mouseleave",
        this.VrFunctions.progressLeaveHandler
      );

      // UI自动隐藏功能
      let timeout: NodeJS.Timeout | null = null;
      let guideTimeout: NodeJS.Timeout | null = null;

      this.VrFunctions.showControls = () => {
        controls.classList.remove("hidden");
        progress.classList.remove("hidden");
        timeDisplay.classList.remove("hidden");

        if (timeout) {
          clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
          controls.classList.add("hidden");
          progress.classList.add("hidden");
          timeDisplay.classList.add("hidden");
        }, 3000);
      };

      // VR引导显示控制
      this.VrFunctions.showGuide = () => {
        vrGuide.classList.add("visible");

        if (guideTimeout) {
          clearTimeout(guideTimeout);
        }

        guideTimeout = setTimeout(() => {
          vrGuide.classList.remove("visible");
        }, 2000);
      };

      // 鼠标移动处理器
      this.VrFunctions.handleMouseMove = (event: MouseEvent) => {
        // 显示控制UI
        this.VrFunctions.showControls();

        // 如果不是在交互中，显示引导
        if (!isUserInteracting) {
          this.VrFunctions.showGuide();
        }
      };

      // 初始显示控制UI和引导
      this.VrFunctions.showControls();
      this.VrFunctions.showGuide();

      // 鼠标移动时显示控制UI和引导
      mask.addEventListener("mousemove", this.VrFunctions.handleMouseMove);
      mask.addEventListener("touchmove", this.VrFunctions.showControls);

      // Initialize Three.js scene
      let scene: any,
        camera: any,
        renderer: any,
        sphere: any,
        videoTexture: any;
      let lon = -90, // 初始角度设为-90度，对准左眼画面中央
        lat = 0;
      let phi = 0,
        theta = 0;
      let isUserInteracting = false;
      let onPointerDownPointerX = 0,
        onPointerDownPointerY = 0;
      let onPointerDownLon = 0,
        onPointerDownLat = 0;
      this.VrFunctions.isFullscreen = false;

      // 根据视频位置更新遮罩与画布大小
      this.VrFunctions.updateMaskPosition = () => {
        if (!mask || this.VrFunctions.isFullscreen) return;
        const rect = video.getBoundingClientRect();
        mask.style.left = rect.left + window.scrollX + "px";
        mask.style.top = rect.top + window.scrollY + "px";
        mask.style.width = rect.width + "px";
        mask.style.height = rect.height + "px";
        mask.style.backgroundColor = "transparent";
        if (renderer) {
          renderer.setSize(rect.width, rect.height);
        }
      };

      // 初始隐藏原视频
      if (video.style.visibility !== "hidden") {
        video.dataset.vrHidden = "true";
        video.style.visibility = "hidden";
      }

      const init = () => {
        // Create Three.js renderer with improved settings
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: false, // 避免与页面背景混合导致的视觉色差
          precision: "highp",
          powerPreference: "high-performance",
        });
        // 显式颜色管理配置，避免默认推断造成的 gamma 偏差
        // three >= 0.152 使用 outputColorSpace
        // @ts-ignore
        renderer.outputColorSpace =
          (THREE as any).SRGBColorSpace ||
          (THREE as any).LinearSRGBColorSpace ||
          renderer.outputColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        (renderer as any).toneMappingExposure = 1;
        // 关闭物理光照以减少额外计算带来的潜在差异
        // @ts-ignore
        renderer.useLegacyLights = true;
        // @ts-ignore 新版本属性
        renderer.physicallyCorrectLights = false;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // 初始渲染尺寸为视频尺寸
        const rect = video.getBoundingClientRect();
        renderer.setSize(rect.width, rect.height);

        // Create scene and camera
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(
          75,
          (video.getBoundingClientRect().width || window.innerWidth) /
            (video.getBoundingClientRect().height || window.innerHeight),
          0.1,
          1000
        );
        (camera as any).target = new THREE.Vector3(0, 0, 0);

        // Create high quality video texture
        videoTexture = new THREE.VideoTexture(video);
        // 强制使用线性采样 & sRGB 输出，确保与 <video> 颜色一致
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        // @ts-ignore 兼容旧属性
        videoTexture.colorSpace =
          (THREE as any).SRGBColorSpace || videoTexture.colorSpace;
        // @ts-ignore 兼容旧版本写法
        if ("encoding" in videoTexture)
          (videoTexture as any).encoding = (THREE as any).SRGBColorSpace;
        // 避免自动色彩转换时的额外处理
        videoTexture.format = THREE.RGBFormat;
        videoTexture.needsUpdate = true;

        // 提高纹理质量
        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        videoTexture.anisotropy = Math.min(maxAnisotropy, 16);
        videoTexture.generateMipmaps = false; // 对于视频纹理通常关闭mipmap

        // Create higher quality sphere geometry
        const geometry = new THREE.SphereGeometry(500, 128, 64); // 增加分段数
        geometry.scale(-1, 1, 1); // Invert sphere geometry to view from inside

        const material = new THREE.MeshBasicMaterial({
          map: videoTexture,
        });
        // MeshBasicMaterial 不参与光照，但确保不被雾/色调映射影响
        (material as any).toneMapped = false;

        sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        camera.position.set(0, 0, 0);
        // Add event listeners for mouse and touch controls
        document.addEventListener(
          "mousedown",
          this.VrFunctions.onPointerDown,
          false
        );
        document.addEventListener(
          "mousemove",
          this.VrFunctions.onPointerMove,
          false
        );
        document.addEventListener(
          "mouseup",
          this.VrFunctions.onPointerUp,
          false
        );

        document.addEventListener(
          "touchstart",
          this.VrFunctions.onPointerDown,
          false
        );
        document.addEventListener(
          "touchmove",
          this.VrFunctions.onPointerMove,
          false
        );
        document.addEventListener(
          "touchend",
          this.VrFunctions.onPointerUp,
          false
        );

        // Resize canvas when window resizes
        window.addEventListener(
          "resize",
          this.VrFunctions.onWindowResize,
          false
        );
      };

      this.VrFunctions.onWindowResize = () => {
        if (this.VrFunctions.isFullscreen) {
          (camera as any).aspect = window.innerWidth / window.innerHeight;
          (camera as any).updateProjectionMatrix();
          (renderer as any).setSize(window.innerWidth, window.innerHeight);
        } else {
          this.VrFunctions.updateMaskPosition();
          const rect = video.getBoundingClientRect();
          (camera as any).aspect = rect.width / rect.height;
          (camera as any).updateProjectionMatrix();
          (renderer as any).setSize(rect.width, rect.height);
        }
      };

      this.VrFunctions.onPointerDown = function (event: any) {
        isUserInteracting = true;

        // 隐藏引导提示
        vrGuide.classList.remove("visible");
        if (guideTimeout) {
          clearTimeout(guideTimeout);
          guideTimeout = null;
        }

        const clientX = event.clientX || event.touches[0].clientX;
        const clientY = event.clientY || event.touches[0].clientY;

        onPointerDownPointerX = clientX;
        onPointerDownPointerY = clientY;

        onPointerDownLon = lon;
        onPointerDownLat = lat;
      };

      this.VrFunctions.onPointerMove = function (event: any) {
        if (isUserInteracting) {
          const clientX = event.clientX || event.touches[0].clientX;
          const clientY = event.clientY || event.touches[0].clientY;

          lon = (onPointerDownPointerX - clientX) * 0.1 + onPointerDownLon;
          lat = (clientY - onPointerDownPointerY) * 0.1 + onPointerDownLat;
        }
      };

      this.VrFunctions.onPointerUp = function () {
        isUserInteracting = false;

        // 交互结束后延迟3秒再显示引导
        if (guideTimeout) {
          clearTimeout(guideTimeout);
        }

        guideTimeout = setTimeout(() => {
          if (!isUserInteracting) {
            // 确保用户没有在交互才显示
            VideoRoll.VrFunctions.showGuide?.();
          }
        }, 3000);
      };

      function animate() {
        requestAnimationFrame(animate);

        lat = Math.max(-85, Math.min(85, lat));
        phi = THREE.MathUtils.degToRad(90 - lat);
        theta = THREE.MathUtils.degToRad(lon);

        (camera as any).target.x = 500 * Math.sin(phi) * Math.cos(theta);
        (camera as any).target.y = 500 * Math.cos(phi);
        (camera as any).target.z = 500 * Math.sin(phi) * Math.sin(theta);
        (camera as any).lookAt((camera as any).target);

        // Render the scene
        (renderer as any).render(scene, camera);
      }

      // Initialize and start animation
      init();
      animate();

      // 初始定位遮罩
      this.VrFunctions.updateMaskPosition();
      window.addEventListener("resize", this.VrFunctions.updateMaskPosition);
      window.addEventListener(
        "scroll",
        this.VrFunctions.updateMaskPosition,
        true
      );

      // 全屏切换逻辑
      this.VrFunctions.toggleFullscreen = () => {
        this.VrFunctions.isFullscreen = !this.VrFunctions.isFullscreen;
        if (this.VrFunctions.isFullscreen) {
          mask.classList.add("vr-fullscreen");
          const aspect = window.innerWidth / window.innerHeight;
          (camera as any).aspect = aspect;
          (camera as any).updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
          fullscreenBtn.textContent = "Exit Fullscreen";
        } else {
          mask.classList.remove("vr-fullscreen");
          this.VrFunctions.updateMaskPosition();
          const rect = video.getBoundingClientRect();
          (camera as any).aspect = rect.width / rect.height;
          (camera as any).updateProjectionMatrix();
          renderer.setSize(rect.width, rect.height);
          fullscreenBtn.textContent = "Fullscreen";
        }
      };

      fullscreenBtn.onclick = () => this.VrFunctions.toggleFullscreen();
    }

    return this;
  }

  static updatePlaybackRate(value?: number) {
    const playbackRate = value ?? this.rollConfig.playbackRate;

    try {
      this.videoElements.forEach((video) => {
        (video as HTMLMediaElement).playbackRate = playbackRate;
      });
    } catch (err) {
      console.debug(err);
    }
  }

  /**
   * HTMLVideoElement.requestPictureInPicture()
   */
  static togglePictureInPicture(pictureInPicture: boolean) {
    if (!pictureInPicture && document.pictureInPictureElement) {
      document.exitPictureInPicture();
      return;
    }

    try {
      if (
        pictureInPicture &&
        document.pictureInPictureEnabled &&
        this.realVideoPlayer.player
      ) {
        this.realVideoPlayer.player.requestPictureInPicture();
      }
    } catch (err) {
      console.debug(err);
    }
  }

  static toggleLoop(video: HTMLVideoElement, loop: boolean) {
    video.loop = loop;
  }

  static buildVideoList() {
    return this.videoList.map((v) => ({
      name: v.name,
      id: v.id,
      visible: v.visible,
      checked: v.checked,
      posterUrl: v.posterUrl,
      duration: v.duration,
      isReal: v.isReal,
      src: v.src,
      percentage: v.percentage ?? 0,
      currentTime: v.currentTime ?? 0,
      paused: v.paused,
    }));
  }

  static getVideoVisibleObserver(
    video: HTMLVideoElement,
    item: any,
    callback: Function
  ) {
    const intersectionObserver = new IntersectionObserver((entries) => {
      if (entries[0].intersectionRatio <= 0) {
        video.setAttribute("data-roll-visible", "false");
        item.visible = isVisible(video);

        callback({
          text: String(this.videoNumbers),
          videoList: this.buildVideoList(),
        });
        return;
      }

      video.setAttribute("data-roll-visible", "true");
      item.visible = isVisible(video);
      callback({
        text: String(this.videoNumbers),
        videoList: this.buildVideoList(),
      });
    });

    intersectionObserver.observe(video);

    return intersectionObserver;
  }

  static capture(video = this.realVideoPlayer.player): Promise<any> {
    const rect = (video as HTMLVideoElement).getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = video?.videoWidth ?? rect.width;
    canvas.height = video?.videoHeight ?? rect.height;

    try {
      context?.drawImage(
        video as HTMLVideoElement,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const dataUrl = canvas.toDataURL("image/png");
      canvas.remove();
      return Promise.resolve(dataUrl);
    } catch (err) {
      if (video) {
        (video as HTMLVideoElement).crossOrigin = "anonymous";
      }

      context?.drawImage(
        video as HTMLVideoElement,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const dataUrl = canvas.toDataURL("image/png");
      canvas.remove();
      return Promise.resolve(dataUrl);
    }
  }

  static updateProgress(
    video: HTMLVideoElement,
    callback: Function,
    event?: Event
  ): void {
    // 获取当前播放时间
    const currentTime = video.currentTime;
    // 获取视频的总时长
    const duration = video.duration;
    // 计算进度百分比
    const progress = (currentTime / duration) * 100;
    const item = this.videoList.find((v) => v.id === video.dataset.rollId);

    if (item) {
      item.percentage = progress;
      item.currentTime = currentTime;
    }

    callback({
      text: String(this.videoNumbers),
      videoList: this.buildVideoList(),
    });

    this.recorder?.updateTime(currentTime);
  }

  static updatePlay(
    video: HTMLVideoElement,
    callback: Function,
    event?: Event
  ) {
    callback({
      text: String(this.videoNumbers),
      videoList: this.buildVideoList(),
    });
  }

  static updateRealVideo(video: HTMLVideoElement, callback: Function) {
    // 当视频开始播放时，将其设为 realVideoPlayer
    // 这可能会触发 realVideoPlayer 的变更，旧的监听器会在 setRealVideoPlayer 中被清理
    this.setRealVideoPlayer(video);

    const item = this.videoList.find((v) => v.id === video.dataset.rollId);
    if (item) {
      item.isReal = true;
    }

    this.videoList.forEach((v) => {
      if (v.id !== video.dataset.rollId) {
        v.isReal = false;
      }
    });

    if (this.rollConfig.skipAd) {
      this.adSkipper?.start();
    }

    callback({
      text: String(this.videoNumbers),
      videoList: this.buildVideoList(),
    });
  }

  static watchVideoProgress(video: HTMLVideoElement, callback: Function) {
    // 清理旧的监听器
    this.clearVideoListeners(video);

    // 创建新的监听器
    const progressHandler = this.updateProgress.bind(this, video, callback);
    video.addEventListener("timeupdate", progressHandler as EventListener);

    // 存储监听器引用
    const existingListeners = this.videoListeners.get(video) || {};
    this.videoListeners.set(video, {
      ...existingListeners,
      progressHandler,
    });
  }

  static watchVideoPlay(video: HTMLVideoElement, callback: Function) {
    // 清理旧的监听器
    const existingListeners = this.videoListeners.get(video) || {};
    if (existingListeners.playHandler) {
      video.removeEventListener(
        "play",
        existingListeners.playHandler as EventListener
      );
    }

    // 创建新的监听器
    const playHandler = this.updateRealVideo.bind(this, video, callback);
    video.addEventListener("play", playHandler as EventListener);

    // 存储监听器引用
    this.videoListeners.set(video, {
      ...existingListeners,
      playHandler,
    });
  }

  static getVideoInfo(video: HTMLVideoElement, index: number) {
    let src = this.getSourceElementSrc(video);

    if (src.startsWith("blob:")) {
      src = src.replace("blob:", "");
    }

    // const time = Math.ceil((video.duration * 10) / 60) / 10;
    // const duration = isNaN(time) ? 0 : time;
    const duration = video.duration || 0;
    if (this.rollConfig.crossorigin) {
      video.setAttribute("crossorigin", "anonymous");
    }

    let poster = video.poster;
    let name = `video ${index + 1}`;
    const isReal = this.realVideoPlayer.player === video;

    if (src === "no-src") {
      return {
        posterUrl: poster,
        duration: video.duration,
        name,
        src,
        isReal,
      };
    }

    try {
      const url = new URL(src);
      name = getName(url);
      if (poster) {
        return {
          posterUrl: poster,
          duration,
          name,
          src,
          isReal,
        };
      }

      return {
        posterUrl: "",
        duration,
        name,
        src,
        isReal,
      };
    } catch (err) {
      console.debug(err);
      return Promise.resolve({
        posterUrl: poster,
        duration,
        src,
        name,
        isReal,
      });
    }
  }

  static getProgress(video: HTMLVideoElement) {
    // 获取当前播放时间
    const currentTime = video.currentTime;
    // 获取视频的总时长
    const duration = video.duration;
    // 计算进度百分比
    const progress = (currentTime / duration) * 100;
    return progress;
  }

  static async useVideoChanged(callback: Function) {
    const videoSelector = this.getVideoSelector(this.getHostName());
    this.updateDocuments().updateVideoElements(videoSelector);
    if (!this.recorder) this.recorder = new Recorder();
    if (!this.looper) this.looper = new Looper();
    if (!this.adSkipper) {
      this.adSkipper = new AdSkipper(
        () => {
          this.updatePlaybackRate(16);
        },
        () => {
          this.updatePlaybackRate(1);
          this.rollConfig.playbackRate = 1;
          updateConfig(this.rollConfig.tabId, this.rollConfig);
        }
      );
    }

    if (!this.summarizer) {
      this.summarizer = new Summarizer();
    }

    const videos = [...this.videoElements];
    const infos = await Promise.all(
      videos.map((v, index) => this.getVideoInfo(v, index))
    );

    this.videoList = videos.map((v, index) => {
      const item: any = {
        id: v.dataset.rollId,
        visible: v.dataset.rollVisible === "true" ? true : false,
        checked: v.dataset.rollCheck === "true" ? true : false,
        currentTime: v.currentTime,
        percentage: this.getProgress(v),
        paused: v.paused,
        ...infos[index],
      };

      // 直接设置监听器，不使用setTimeout包装
      this.watchVideoProgress(v, callback);
      this.watchVideoPlay(v, callback);

      // item.visibleObserver = this.getVideoVisibleObserver(v, item, callback)

      return item;
    });

    callback({
      text: String(this.videoNumbers),
      videoList: this.buildVideoList(),
    });
  }

  static isVideoChange(mutationItem: any) {
    if (mutationItem.target.nodeName === "VIDEO") return true;

    if (
      Array.from(mutationItem.addedNodes).some(
        (v: any) => v.nodeName === "VIDEO"
      ) ||
      Array.from(mutationItem.removedNodes).some(
        (v: any) => v.nodeName === "VIDEO"
      )
    )
      return true;

    if (mutationItem.target.querySelectorAll("video")) return true;

    return false;
  }

  /**
   * update video number
   * @param callback
   */
  static observeVideo(callback: Function) {
    if (this.rollConfig?.enable === false) return this;

    this.useVideoChanged(callback);

    try {
      const elementToObserve = document.querySelector("body") as Node;
      if (!elementToObserve) return this;

      if (!this.observer) {
        this.observer = new MutationObserver(
          debounce((mutationList: any) => {
            for (const item of mutationList) {
              if (this.isVideoChange(item)) {
                this.useVideoChanged(callback);
              }
            }
          }, 300)
        );

        this.observer.observe(elementToObserve, {
          childList: true,
          subtree: true,
          attributeFilter: [
            "src",
            "autoplay",
            "mediatype",
            "x5-playsinline",
            "data-xgplayerid",
            "playsinline",
            "crossorigin",
            "poster",
            "data-index",
            "preload",
            "controls",
            "muted",
          ],
          attributes: true,
        });
      }
    } catch (err) {
      console.debug(err);
    }

    return this;
  }

  static updateVideoCheck(ids: any[]) {
    const elements = Array.from(this.videoElements);
    this.videoList.forEach((v) => {
      const video = elements.find((x) => x.dataset.rollId === v.id);
      if (video) {
        video.dataset.rollCheck = ids.includes(video.dataset.rollId)
          ? "true"
          : "false";
      }
    });

    this.videoList = this.videoList.map((v: any, index) => {
      v.checked = ids.includes(v.id);
      return v;
    });

    this.updateVideo(this.rollConfig);
    return this;
  }

  static removeStyle(target: HTMLElement) {
    target.classList.remove("video-roll-highlight");
    target.classList.remove("video-roll-deg-scale");
    target.classList.remove("video-roll-focus");

    document.getElementById("video-roll-deg-scale")?.remove();
    document.getElementById("video-roll-focus-style")?.remove();
  }

  static stop() {
    this.videoElements.forEach((v) => {
      this.removeStyle(v);
    });
    this.resetAudio();
    this.stopRecord();

    this.videoElements.forEach((video) => {
      (video as HTMLMediaElement).playbackRate = 1;
    });

    if (this.rollConfig.vr.on) {
      this.updateVr(this.realVideoPlayer.player as HTMLVideoElement, false);
    }

    if (this.rollConfig.focus.on) {
      this.updateFocus(
        this.realVideoPlayer.player as HTMLVideoElement,
        { on: false } as Focus
      );
      const mask = document.getElementById(
        "video-roll-root-mask"
      ) as HTMLElement;
      mask?.remove();
    }

    if (this.rollConfig.pictureInPicture) {
      this.togglePictureInPicture(false);
    }

    // 调用comprehensive cleanup method
    this.cleanup();

    sendRuntimeMessage(this.rollConfig.tabId, {
      type: ActionType.DISABLED,
      rollConfig: this.rollConfig,
    });
  }

  static restart() {}

  static startRecord() {
    if (!this.recorder) {
      this.recorder = new Recorder();
    }

    this.recorder.startRecord(
      this.realVideoPlayer.player as HTMLVideoElement,
      (info: any) => {
        sendRuntimeMessage(this.rollConfig.tabId, {
          type: ActionType.RECORD_INFO,
          rollConfig: {
            ...this.rollConfig,
            recordStatus: this.recorder.status,
            ...info,
          },
        });
      }
    );
  }

  static stopRecord() {
    if (this.recorder) {
      this.recorder.stopRecord(this.realVideoPlayer.player as HTMLVideoElement);
    }
  }

  static getRecordStatus() {
    return this.recorder?.status ?? undefined;
  }

  static updateLoop(abLoop: Abloop) {
    if (abLoop.on === true) {
      this.startLoop(abLoop);
    } else {
      this.stopLoop();
    }
  }

  static startLoop(abLoop: Abloop) {
    if (!this.looper) {
      this.looper = new Looper();
    }

    this.looper.startLoop(
      this.realVideoPlayer.player as HTMLVideoElement,
      abLoop
    );
  }

  static stopLoop() {
    if (this.looper) {
      this.looper.stopLoop(this.realVideoPlayer.player as HTMLVideoElement);
    }
  }

  static updateDownloadList(downloadList: any[]) {
    this.downloadList = downloadList;
  }

  /**
   * 从右键菜单触发：采集当前 real video 的封面与元数据，压缩图片并保存到 storage.local
   */
  static async captureFavourite() {
    try {
      const player = this.realVideoPlayer?.player as HTMLVideoElement | null;
      if (!player) {
        console.debug("[VideoRoll] captureFavourite: no active video");
        return;
      }

      // 截图 (使用现有 capture, 返回 base64 PNG) -> 转换为 webp blob 降低体积
      const base64 = await this.capture(player);
      const blob = await (async () => {
        try {
          const img = await new Promise<HTMLImageElement>((res, rej) => {
            const image = new Image();
            image.onload = () => res(image);
            image.onerror = rej;
            image.src = base64;
          });
          const canvas = document.createElement("canvas");
          // 目标宽度 320，等比缩放
          const scale = 320 / img.width;
          canvas.width = 320;
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const webp: Blob = await new Promise((res) =>
            canvas.toBlob((b) => res(b as Blob), "image/webp", 0.65)
          );
          return webp;
        } catch (e) {
          console.debug("fallback to original base64 png blob");
          const raw = atob(base64.split(",")[1]);
          const u8 = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
          return new Blob([u8], { type: "image/png" });
        }
      })();

      const arrayBuffer = await blob.arrayBuffer();
      const coverBytes = Array.from(new Uint8Array(arrayBuffer)); // storage.local 不直接存 Blob，只存数字数组

      // 元数据
      const now = Date.now();
      const title = document.title || location.href;
      const domain = location.hostname.replace(/^www\./, "");
      const favIcon =
        (document.querySelector('link[rel~="icon"]') as HTMLLinkElement)
          ?.href ||
        (document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement)
          ?.href ||
        (document.querySelector('link[rel="Shortcut Icon"]') as HTMLLinkElement)
          ?.href ||
        "";
      const downloadable =
        Array.isArray(this.downloadList) && this.downloadList.length > 0;

      // 关键词：基于标题简单拆分，去重
      const titleKeywords = Array.from(
        new Set(title.split(/[^\p{L}\p{N}]+/u).filter(Boolean))
      ).slice(0, 10);

      // 评论关键词：扫描 id/class 含 comment
      const commentContainers: Element[] = Array.from(
        document.querySelectorAll('[id*="comment" i], [class*="comment" i]')
      );
      const commentText = commentContainers
        .map((el) => el.textContent || "")
        .join(" ");
      const commentWords = Array.from(
        new Set(
          commentText.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1)
        )
      ).slice(0, 15);

      const record = {
        id: crypto.randomUUID(),
        title,
        pageUrl: location.href,
        domain,
        addedAt: now,
        favIcon,
        downloadable,
        keywords: titleKeywords,
        commentKeywords: commentWords,
        cover: {
          mime: blob.type,
          data: coverBytes,
          width: (blob as any).width,
          height: (blob as any).height,
        },
      } as any;

      // 持久化到 storage.local 下 favourites 数组
      const existing = await chrome.storage.local.get("favourites");
      const list: any[] = Array.isArray(existing.favourites)
        ? existing.favourites
        : [];
      list.unshift(record); // 最新在前
      await chrome.storage.local.set({ favourites: list.slice(0, 500) }); // 简单截断
      console.debug("[VideoRoll] favourite saved", record);
    } catch (err) {
      console.debug("[VideoRoll] captureFavourite error", err);
    }
  }

  static downloadSingleVideo(
    videoInfo: any,
    rollConfig: IRollConfig,
    favIcon: string
  ) {
    sendRuntimeMessage(this.rollConfig.tabId, {
      type: ActionType.DOWNLOAD_SINGLE_VIDEO,
      videoInfo,
      rollConfig: this.rollConfig,
      favIcon,
    });
  }

  static play(videoId: string) {
    this.realVideoPlayer.player?.play();
    const item = this.videoList.find((v) => v.id === videoId);
    if (item) {
      item.paused = false;
    }
    sendRuntimeMessage(this.rollConfig.tabId, {
      type: ActionType.PLAY,
      videoList: this.videoList,
      rollConfig: this.rollConfig,
    });
  }

  static pause(videoId: string) {
    this.realVideoPlayer.player?.pause();
    const item = this.videoList.find((v) => v.id === videoId);
    if (item) {
      item.paused = true;
    }
    sendRuntimeMessage(this.rollConfig.tabId, {
      type: ActionType.PAUSE,
      videoList: this.videoList,
      rollConfig: this.rollConfig,
    });
  }

  static async parseSubtitle(url: string, summaryOptions: any) {
    if (!this.summarizer) {
      this.summarizer = new Summarizer();
    }

    const data = await this.summarizer.getSubtitleByUrl(
      url,
      summaryOptions.size,
      this.rollConfig.tabId
    );
    await this.summarizer.generateSummary(
      data as string,
      this.rollConfig.tabId,
      summaryOptions
    );
  }

  static checkModel() {
    if (!this.summarizer) {
      this.summarizer = new Summarizer();
    }

    sendRuntimeMessage(this.rollConfig.tabId, {
      type: ActionType.GET_SUMMARIZER_INFO,
      tabId: this.rollConfig.tabId,
      rollConfig: this.rollConfig,
    });

    this.summarizer.checkModel(this.rollConfig.tabId);
  }

  static async downloadModel() {
    if (!this.summarizer) {
      this.summarizer = new Summarizer();
    }

    await this.summarizer.downloadModel(this.rollConfig.tabId);
    this.summarizer.checkModel(this.rollConfig.tabId);
  }

  /**
   * 监听realVideoPlayer的属性变化和画中画状态变化，同步rollConfig配置
   */
  static setupVideoPropertiesWatcher() {
    // 移除之前的监听器（如果存在）
    this.removeVideoPropertiesWatcher();

    const realPlayer = this.realVideoPlayer.player as HTMLVideoElement;
    if (!realPlayer) return this;

    // 监听播放速度变化
    this.playbackRateWatcher = () => {
      const currentRate = realPlayer.playbackRate;
      if (this.rollConfig.playbackRate !== currentRate) {
        if (!this.rollConfig.forced) {
          this.rollConfig.playbackRate = currentRate;
        }

        // 通知背景脚本配置已更新
        updateConfig(this.rollConfig.tabId, this.rollConfig);
      }
    };

    // 监听循环播放状态变化
    this.loopWatcher = () => {
      const currentLoop = realPlayer.loop;
      if (this.rollConfig.loop !== currentLoop) {
        if (!this.rollConfig.forced) {
          this.rollConfig.loop = currentLoop;
        }
        updateConfig(this.rollConfig.tabId, this.rollConfig);
        // 通知背景脚本配置已更新
      }
    };

    // 监听画中画状态变化
    this.pictureInPictureWatcher = () => {
      const isPipActive = document.pictureInPictureElement === realPlayer;
      if (this.rollConfig.pictureInPicture !== isPipActive) {
        if (!this.rollConfig.forced) {
          this.rollConfig.pictureInPicture = isPipActive;
        }

        updateConfig(this.rollConfig.tabId, this.rollConfig);
      }
    };

    // 添加事件监听器
    realPlayer.addEventListener("ratechange", this.playbackRateWatcher);

    // 使用 MutationObserver 监听 loop 属性变化
    this.loopObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "loop"
        ) {
          this.loopWatcher?.();
        }
      });
    });

    this.loopObserver.observe(realPlayer, {
      attributes: true,
      attributeFilter: ["loop"],
    });

    // 监听画中画事件
    document.addEventListener(
      "enterpictureinpicture",
      this.pictureInPictureWatcher
    );
    document.addEventListener(
      "leavepictureinpicture",
      this.pictureInPictureWatcher
    );

    return this;
  }

  /**
   * 移除视频属性监听器
   */
  static removeVideoPropertiesWatcher() {
    const realPlayer = this.realVideoPlayer.player as HTMLVideoElement;

    if (realPlayer && this.playbackRateWatcher) {
      realPlayer.removeEventListener("ratechange", this.playbackRateWatcher);
    }

    if (this.loopObserver) {
      this.loopObserver.disconnect();
      this.loopObserver = null;
    }

    if (this.pictureInPictureWatcher) {
      document.removeEventListener(
        "enterpictureinpicture",
        this.pictureInPictureWatcher
      );
      document.removeEventListener(
        "leavepictureinpicture",
        this.pictureInPictureWatcher
      );
    }

    // 清理监听器引用
    this.playbackRateWatcher = null;
    this.loopWatcher = null;
    this.pictureInPictureWatcher = null;

    return this;
  }

  static clearBackToTabTimer = (() => {
    let hideTimeout: NodeJS.Timeout | null = null;

    // 返回一个对象，包含设置和清理定时器的方法
    return {
      set: (callback: () => void, delay: number) => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
        }
        hideTimeout = setTimeout(callback, delay);
      },
      clear: () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      },
    };
  })();

  /**
   * 清理所有事件监听器和资源，防止内存泄漏
   */
  static cleanup() {
    try {
      // 清理视频进度监听器
      this.clearAllVideoListeners();

      // 清理全局回调函数引用
      this.eventCallback = null;
      this.playCallback = null;

      // 清理VR相关的事件监听器
      if (this.VrFunctions) {
        if (this.VrFunctions.onPointerDown) {
          document.removeEventListener(
            "mousedown",
            this.VrFunctions.onPointerDown
          );
          document.removeEventListener(
            "touchstart",
            this.VrFunctions.onPointerDown
          );
        }
        if (this.VrFunctions.onPointerMove) {
          document.removeEventListener(
            "mousemove",
            this.VrFunctions.onPointerMove
          );
          document.removeEventListener(
            "touchmove",
            this.VrFunctions.onPointerMove
          );
        }
        if (this.VrFunctions.onPointerUp) {
          document.removeEventListener("mouseup", this.VrFunctions.onPointerUp);
          document.removeEventListener(
            "touchend",
            this.VrFunctions.onPointerUp
          );
        }
        if (this.VrFunctions.onWindowResize) {
          window.removeEventListener("resize", this.VrFunctions.onWindowResize);
        }
        if (this.VrFunctions.handleMouseMove) {
          const mask = document.getElementById("video-roll-root-mask");
          if (mask) {
            mask.removeEventListener(
              "mousemove",
              this.VrFunctions.handleMouseMove
            );
            mask.removeEventListener(
              "touchmove",
              this.VrFunctions.showControls
            );
          }
        }

        // 清理进度条相关的事件监听器
        const progress = document.getElementById("video-roll-vr-progress");
        if (progress) {
          if (this.VrFunctions.progressClickHandler) {
            progress.removeEventListener(
              "click",
              this.VrFunctions.progressClickHandler
            );
          }
          if (this.VrFunctions.progressMoveHandler) {
            progress.removeEventListener(
              "mousemove",
              this.VrFunctions.progressMoveHandler
            );
          }
          if (this.VrFunctions.progressLeaveHandler) {
            progress.removeEventListener(
              "mouseleave",
              this.VrFunctions.progressLeaveHandler
            );
          }
        }

        // 清理VR函数引用
        this.VrFunctions = {};
      }

      // 清理mask相关的事件监听器
      const mask = document.getElementById("video-roll-root-mask");
      if (mask) {
        mask.removeEventListener("mousemove", this.showBackToTab);
        const backToTab = document.getElementById("video-roll-back-to-tab");
        if (backToTab) {
          backToTab.removeEventListener("click", this.backToTab);
        }
      }

      // 清理定时器
      this.clearBackToTabTimer.clear();
      if (this.propertiesCheckInterval) {
        clearInterval(this.propertiesCheckInterval);
        this.propertiesCheckInterval = null;
      }

      // 清理MutationObserver
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      // 清理视频属性监听器
      this.removeVideoPropertiesWatcher();

      // 清理各种类实例
      if (this.recorder) {
        this.recorder.stopRecord(
          this.realVideoPlayer.player as HTMLVideoElement
        );
        // Note: Cannot set to null due to TypeScript constraints
      }

      if (this.looper) {
        this.looper.stopLoop(this.realVideoPlayer.player as HTMLVideoElement);
        // Note: Cannot set to null due to TypeScript constraints
      }

      if (this.adSkipper) {
        this.adSkipper.stop();
        // Note: Cannot set to null due to TypeScript constraints
      }

      if (this.summarizer) {
        // Note: Summarizer doesn't have a stop method, but it's managed by background script
      }

      if (this.audioController) {
        // Note: AudioController doesn't have explicit cleanup method
      }

      // 清理所有数据结构
      this.clearVideoElements();
      this.clearOriginElementPosition();
      this.clearRealVideoPlayer();
      this.documents = [];
      this.videoNumbers = 0;
      this.videoList = [];
      this.downloadList = [];
      this.audioElements.clear();

      console.debug("VideoRoll cleanup completed successfully");
    } catch (error) {
      console.error("Error during VideoRoll cleanup:", error);
    }
  }

  static createAudio(rollConfig: IRollConfig) {
    if (this.audioController) return;

    this.audioController = new AudioController(
      {
        type: "element",
        el: this.realVideoPlayer.player as HTMLVideoElement,
      },
      rollConfig.tabId,
      rollConfig,
      (error: any, tabId: number) => {
        console.error(error);
      }
    );
  }

  static updateResetAudio(rollConfig: IRollConfig) {
    if (!this.audioController) {
      this.createAudio(rollConfig);
    }

    this.audioController?.update(rollConfig);
  }
}
