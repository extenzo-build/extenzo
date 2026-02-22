/*
 * @description: inject
 * @Author: Gouxinyu
 * @Date: 2022-01-11 23:49:59
 */
import { ActionType, VideoListItem } from "../types/type.d";
import {
  updateConfig,
  updateOnMounted,
  updateStorage,
  updateBadge,
  initKeyboardEvent,
  onHoverVideoElement,
  updateVideoCheck,
  updateEnable,
  capture,
  advancedPictureInPicture,
  startRecord,
  stopRecord,
  createAudioCapture,
  updateDownloadList,
  downloadSingleVideo,
  parseSubtitle,
  checkModel,
  downloadModel,
  resetAudio,
  updateResetAudio,
  captureFavourite
} from "./update";
import { sendRuntimeMessage } from "../util";
import browser from "webextension-polyfill";

function injectScript() {
  const injectJs = document.getElementById("video-roll-script");

  if (injectJs) return;

  const src = browser.runtime.getURL("content/web-component.js");
  const script = document.createElement("script");
  script.setAttribute("id", "video-roll-script");
  script.setAttribute("type", "module");
  script.setAttribute("src", src);

  (document.head || document.documentElement).appendChild(script);
}

function injectAuth() {
  if (location.host !== "videoroll.app" && location.host !== "www.videoroll.app") return;
  // Bridge page -> background for secure storage (no plaintext here)
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === "videoroll_auth_signin" && data.data?.user) {
      chrome.runtime.sendMessage({ type: "videoroll_auth_signin", user: data.data.user });
    } else if (data.type === "videoroll_auth_signout") {
      chrome.runtime.sendMessage({ type: "videoroll_auth_signout" });
    }
  });
}

(function () {
  let videoNumber: number = 0;
  // injectScript();
  injectAuth();
  
  // 存储监听器引用以便清理
  let messageListener: ((data: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void) | null = null;
  let beforeUnloadListener: (() => void) | null = null;
  
  /**
   * 清理所有监听器
   */
  function cleanup() {
    if (messageListener) {
      chrome.runtime?.onMessage.removeListener(messageListener);
      messageListener = null;
    }
    
    if (beforeUnloadListener) {
      window.removeEventListener('beforeunload', beforeUnloadListener);
      beforeUnloadListener = null;
    }
  }
  
  /**
   * get message from popup or backgound
   */
  messageListener = async (data, b, send) => {
    const {
      rollConfig,
      tabId,
      type,
      id,
      isIn,
      ids,
      streamId,
      downloadList,
      videoInfo,
      videoId,
      favIcon,
      subtitleUrl,
      summaryOptions
    } = data;

    try {
      switch (type) {
        case ActionType.GET_BADGE: {
          updateBadge({
            tabId,
            rollConfig,
            callback: ({
              text,
              videoList,
            }: {
              text: string;
              videoList: VideoListItem[];
            }) => {
              videoNumber = Number(text);
              sendRuntimeMessage(tabId, {
                text,
                type: ActionType.UPDATE_BADGE,
                videoList,
              });
            },
          });
          break;
        }
        // when popup onMounted, set init flip value to background,
        // through backgroundjs sending message to popup to store flip value
        case ActionType.ON_MOUNTED: {
          updateOnMounted(tabId, { ...rollConfig, videoNumber });
          break;
        }
        case ActionType.UPDATE_STORAGE:
          updateStorage({ ...rollConfig, videoNumber }, send);
          return;
        case ActionType.UPDATE_CONFIG: {
          updateConfig(tabId, { ...rollConfig, videoNumber });
          break;
        }
        case ActionType.INIT_SHORT_CUT_KEY:
          initKeyboardEvent(tabId);
          break;
        case ActionType.ON_HOVER_VIDEO: {
          onHoverVideoElement(id, isIn);
          break;
        }
        case ActionType.UPDATE_VIDEO_CHECK: {
          updateVideoCheck(ids);
          break;
        }
        case ActionType.UPDATE_ENABLE: {
          updateEnable(tabId, { ...rollConfig, videoNumber });
          break;
        }
        case ActionType.CAPTURE: {
          capture(tabId, { ...rollConfig });
          break;
        }
        case ActionType.ADVANCED_PICTURE_IN_PICTURE: {
          advancedPictureInPicture(tabId, { ...rollConfig });
          break;
        }
        case ActionType.START_RECORD:
          console.log("Starting video recording...");
          startRecord(tabId, { ...rollConfig });
          break;
        case ActionType.STOP_RECORD:
          stopRecord(tabId, { ...rollConfig });
          break;
        case ActionType.AUDIO_CAPTURE:
          createAudioCapture(tabId, { ...rollConfig }, streamId);
          break;
        case ActionType.GET_DOWNLOAD_LIST:
          updateDownloadList(tabId, downloadList);
          break;
        case ActionType.DOWNLOAD_SINGLE_VIDEO:
          downloadSingleVideo(tabId, { ...rollConfig }, videoInfo, favIcon);
          break;
        case ActionType.PARSE_SUBTITLE:
          parseSubtitle(tabId, { ...rollConfig }, subtitleUrl, summaryOptions);
          break;
        case ActionType.CHECK_SUMMARIZER:
          console.log("Checking summarizer model availability...");
          checkModel(tabId, { ...rollConfig });
          break;
        case ActionType.DOWNLOAD_SUMMARIZER:
          downloadModel(tabId, { ...rollConfig });
          break;
        case ActionType.RESET_AUDIO:
          resetAudio(tabId, { ...rollConfig });
          break;
        case ActionType.UPDATE_ELEMENT_AUDIO:
          updateResetAudio(tabId, { ...rollConfig });
          break;
        case ActionType.CONTEXT_CAPTURE_FAV: {
          // 调用页面内脚本函数（通过注入的 download.js 或直接在此处理）
          // 这里直接动态导入 VideoRoll 并执行
          captureFavourite(tabId, { ...rollConfig })
          break;
        }
        default:
          return;
      }

      send("getMessage success");
    } catch (err) {
      console.debug(err);
    }
  };
  
  // 添加监听器
  chrome.runtime.onMessage.addListener(messageListener);
  
  // 监听页面卸载，清理监听器
  beforeUnloadListener = () => {
    cleanup();
  };
  
  window.addEventListener('beforeunload', beforeUnloadListener);
})();

