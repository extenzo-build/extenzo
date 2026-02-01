import VideoRoll from "./VideoRoll";
import browser from "@extenzo/utils/webextension-polyfill";
import { ActionType, IRollConfig, VideoListItem } from "../types/type.d";
import {
  getSessionStorage,
  getLocalStorage,
  setSessionStorage,
  setLocalStorage,
  removeLocalStorage,
  setStorageByKey,
} from "../util/storage";
import { getDomain, sendRuntimeMessage } from "src/util";
import hotkeys from "hotkeys-js";
import { shortcutsMap } from "src/use/useShortcuts";
import { getGeneralConfig } from "./utils/getGeneralConfig";
import { getUserSecure } from "../background/secureUser";

/**
 * get badge text
 * @returns
 */
async function getTabBadge(callback: Function) {
  VideoRoll.observeVideo(callback);
}

function hasConfig(config: any) {
  if (typeof config !== "object") return false;

  return Reflect.ownKeys(config).length > 0;
}

async function getChromStore(key: string, defaultValue: any) {
  return browser.storage.sync.get(key).then((res) => {
    return res?.[key] ?? defaultValue;
  });
}

/**
 * update rollConfig
 * @param rollConfig
 */
export async function updateConfig(tabId: number, rollConfig: IRollConfig) {
  if (rollConfig.enable === false) return;

  // if (VideoRoll.videoElements.size === 0) return;

  rollConfig.isInit = false;
  rollConfig = await getGeneralConfig(rollConfig);
  VideoRoll.updateVideo(rollConfig).updateAudio();

  const config = VideoRoll.getRollConfig();

  if (config.store) {
    setLocalStorage(rollConfig);
  } else {
    removeLocalStorage(`video-roll-${rollConfig.url}`);
  }

  setSessionStorage(rollConfig, config);

  sendRuntimeMessage(tabId, {
    rollConfig: config,
    type: ActionType.UPDATE_STORAGE,
    tabId,
  });
}

/**
 * fired when open popup
 * @param rollConfig
 */
export async function updateOnMounted(tabId: number, rollConfig: IRollConfig) {
  let config = await getLocalStorage(rollConfig.url);

  // set session storage
  if (!hasConfig(config)) {
    config = getSessionStorage(rollConfig.tabId);
  }

  const domain = getDomain(rollConfig.url);
  const key = `video-roll-disabled-${domain}`;
  const data = await browser.storage.sync.get(`video-roll-disabled-${domain}`);
  // Secure (encrypted) user retrieval
  try {
    const secureUser = await getUserSecure();
    // Preserve legacy shape: { user: actualUser }
    sendRuntimeMessage(tabId, { type: ActionType.USER_INFO, tabId, user: { user: secureUser } });
  } catch (e) {
    sendRuntimeMessage(tabId, { type: ActionType.USER_INFO, tabId, user: { user: null } });
  }

  config = {
    ...config,
    videoNumber: rollConfig.videoNumber,
    tabId: rollConfig.tabId,
    tabIndex: rollConfig.tabIndex,
    enable: data[key] ? false : true,
    recordStatus: VideoRoll.getRecordStatus(),
    recordTime: VideoRoll.recorder?.time ?? 0,
  };

  const { popupOpenCount, hasRated, disabledRating } =
    await chrome.storage.sync.get([
      "popupOpenCount",
      "hasRated",
      "disabledRating",
    ]);

  sendRuntimeMessage(tabId, {
    rollConfig: config,
    type: ActionType.UPDATE_STORAGE,
    tabId,
    rateInfo: {
      popupOpenCount,
      hasRated,
      disabledRating,
    },
  });
  if (config.enable === false) return;

  VideoRoll.setRollConfig(config).updateDocuments().addStyleClass();
  sendRuntimeMessage(tabId, {
    downloadList: VideoRoll.downloadList,
    type: ActionType.GET_DOWNLOAD_LIST,
    tabId,
  });
  sendRuntimeMessage(tabId, {
    iframes: VideoRoll.getRollConfig().iframes,
    type: ActionType.UPDATE_IFRAMES,
    tabId,
  });
}

/**
 * update badge
 * @param options
 */
export async function updateBadge(options: any) {
  const { tabId, rollConfig, callback } = options;

  getTabBadge(callback);

  const { config, tabConfig } = await getStorageConfig(tabId);

  const hasConf = hasConfig(config);

  if (tabConfig) {
    tabConfig.document = { title: document.title };
    await getGeneralConfig(tabConfig);
    tabConfig.url = window.location.href;
    const domain = getDomain(tabConfig.url);
    const key = `video-roll-disabled-${domain}`;
    const data = await browser.storage.sync.get(key);
    if (data[key]) {
      tabConfig.enable = false;
      if (rollConfig) {
        rollConfig.enable = false;
      }
    }

    if (!hasConf) tabConfig.store = false;
    sessionStorage.setItem(`video-roll-${tabId}`, JSON.stringify(tabConfig));

    if (tabConfig.enable === false) return;

    VideoRoll.setRollConfig(tabConfig)
      .addStyleClass(true)
      .updateVideo(tabConfig);
  }

  if (hasConf) {
    config.isInit = true;
    config.document = { title: document.title };
    await getGeneralConfig(config);
    const domain = getDomain(config.url);
    const key = `video-roll-disabled-${domain}`;
    const data = await browser.storage.sync.get(key);
    if (data[key]) config.enable = false;

    setLocalStorage(config);

    sessionStorage.setItem(`video-roll-${tabId}`, JSON.stringify(config));

    if (config.enable === false) return;

    VideoRoll.setRollConfig(config)
      .addStyleClass(true)
      .updateVideo(rollConfig ?? config);
  }
}

export function updateStorage(rollConfig: IRollConfig, send: Function) {
  rollConfig.isInit = false;
  send("flip");
}

/**
 * get Storage
 * @param tabId
 * @returns
 */
export async function getStorageConfig(tabId: number) {
  const config = await getLocalStorage();

  if (hasConfig(config)) {
    config.tabId = tabId;
  }

  // store this tab
  const tabConfig = getSessionStorage(tabId);

  return { config, tabConfig };
}

export async function keyDownEvent(tabId: number, res: any, handler: any) {
  const { config, tabConfig } = await getStorageConfig(tabId);

  if (!hasConfig(config) && !tabConfig) return;
  const keys = Object.keys(shortcutsMap);

  let newConfig = tabConfig || config;
  for (const key of keys) {
    const item = (shortcutsMap as any)[key];
    const resItem = res[key];
    if (
      JSON.stringify(resItem.shortcuts?.code) === JSON.stringify(handler.keys)
    ) {
      if (item.trigger) {
        item.trigger({
          VideoRoll,
          rollConfig: newConfig,
        });
        return;
      }

      const data = item.handler(newConfig[item.key]);
      newConfig[item.key] = data;
      updateConfig(tabId, newConfig);
      return;
    }
  }
}

export function initKeyboardEvent(tabId: number) {
  browser.storage.sync
    .get("shortcuts")
    .then((res) => {
      const map = res?.["shortcuts"] ?? {};
      return map;
    })
    .then((res) => {
      hotkeys.unbind("*");

      hotkeys("*", function (event, handler) {
        keyDownEvent(tabId, res, handler);
      });
    });
}

export function onHoverVideoElement(id: string, isIn: boolean) {}

export function updateVideoCheck(ids: string[]) {
  VideoRoll.updateVideoCheck(ids);
}

export function updateEnable(tabId: number, rollConfig: IRollConfig) {
  setStorageByKey(rollConfig).then(() => {
    const oldConfig = getSessionStorage(tabId);
    setSessionStorage(oldConfig, rollConfig);

    if (rollConfig.enable === false) {
      VideoRoll.stop();
      hotkeys.unbind("*");
    } else if (rollConfig.enable === true) {
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
          // VideoRoll.addStyleClass().updateVideo(rollConfig).updateAudio();
          sendRuntimeMessage(tabId, {
            text,
            type: ActionType.UPDATE_BADGE,
            videoList,
            tabId,
          });

          sendRuntimeMessage(tabId, {
            type: ActionType.ENABLE,
            rollConfig,
          });
        },
      });
      initKeyboardEvent(tabId);
    }
  });
}

export function capture(tabId: number, rollConfig: IRollConfig) {
  VideoRoll.capture().then((url) => {
    sendRuntimeMessage(tabId, { type: ActionType.CAPTURE, imgData: url });
  });
}

export function advancedPictureInPicture(
  tabId: number,
  rollConfig: IRollConfig
) {
  // 获取屏幕的宽度和高度
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;

  const { width, height } = VideoRoll.realVideoPlayer;
  // 计算窗口的位置（右下角）
  const leftPosition = screenWidth - width;
  const topPosition = screenHeight - height;

  sendRuntimeMessage(tabId, {
    type: ActionType.ADVANCED_PICTURE_IN_PICTURE,
    windowConfig: {
      leftPosition,
      topPosition,
      width,
      height,
      tabIndex: rollConfig.tabIndex,
    },
  });
}

export function startRecord(tabId: number, rollConfig: IRollConfig) {
  VideoRoll.startRecord();
}

export function stopRecord(tabId: number, rollConfig: IRollConfig) {
  VideoRoll.stopRecord();
  sendRuntimeMessage(tabId, { type: ActionType.STOP_RECORD });
}

export function createAudioCapture(
  tabId: number,
  rollConfig: IRollConfig,
  streamId: string
) {
  VideoRoll.createAudioCapture(streamId);
}

export function updateDownloadList(tabId: number, downloadList: any[]) {
  VideoRoll.updateDownloadList(downloadList);
  sendRuntimeMessage(tabId, {
    downloadList: VideoRoll.downloadList,
    type: ActionType.GET_DOWNLOAD_LIST,
    tabId,
  });
}

export function downloadSingleVideo(
  tabId: number,
  rollConfig: IRollConfig,
  videoInfo: any,
  favIcon: string
) {
  VideoRoll.downloadSingleVideo(videoInfo, rollConfig, favIcon);
}

export function play(tabId: number, videoId: any) {
  VideoRoll.play(videoId);
}

export function pause(tabId: number, videoId: any) {
  VideoRoll.pause(videoId);
}

export function parseSubtitle(
  tabId: number,
  rollConfig: IRollConfig,
  url: string,
  summaryOptions: any
) {
  VideoRoll.parseSubtitle(url, summaryOptions);
}

export function checkModel(tabId: number, rollConfig: IRollConfig) {
  VideoRoll.checkModel();
}

export function downloadModel(tabId: number, rollConfig: IRollConfig) {
  VideoRoll.downloadModel();
}

export function resetAudio(tabId: number, rollConfig: IRollConfig) {
  VideoRoll.createAudio(rollConfig);
}

export function updateResetAudio(tabId: number, rollConfig: IRollConfig) {
  VideoRoll.updateResetAudio(rollConfig);
}

export function captureFavourite(tabId: number, rollConfig: IRollConfig) {
  VideoRoll.captureFavourite();
}

