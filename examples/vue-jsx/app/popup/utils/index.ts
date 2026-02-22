/*
 * @description: utils
 * @Author: Gouxinyu
 * @Date: 2022-09-11 10:58:15
 */
import {
    RollKey,
    RollValue,
    IRollConfig,
    ActionType,
} from "../../types/type.d";
import WEBSITE from "../../website";
import { clone } from "../../util";

// url reg
const urlReg = /^http(s)?:\/\/(.*?)\//;

/**
 * send message to inject.js
 * @param rollConfig
 * @param extra
 * @param send
 */
function sendMessage(
    rollConfig: IRollConfig,
    extra = {},
    send = (res: any) => {
        console.debug(res);
    }
) {
    chrome.tabs.sendMessage(
        rollConfig.tabId,
        { tabId: rollConfig.tabId, rollConfig: clone(rollConfig), type: ActionType.UPDATE_CONFIG },
        extra,
        send
    );
}

/**
 * update config
 * @param rollConfig
 * @param key
 * @param value
 */
function updateRollConfig(
    rollConfig: IRollConfig,
    key: RollKey,
    value: RollValue
) {
    if (key in rollConfig) {
        rollConfig[key] = value;
        sendMessage(rollConfig);
    }
}

function batchUpdateRollConfig(rollConfig: IRollConfig, values: any) {
    Object.keys(values).forEach((key) => {
        if (key in rollConfig) {
            rollConfig[key] = values[key];
        }
    });

    sendMessage(rollConfig);
}

function reloadPage(tabId: number) {
    chrome.tabs.reload(tabId);
}

/**
 * initialize config
 * @param rollConfig
 * @param tab
 * @returns
 */
function initRollConfig(rollConfig: IRollConfig, tab: any): void {
    const { url } = tab;
    rollConfig.tabId = tab.id;
    rollConfig.tabIndex = tab.index;
    rollConfig.url = url;
    rollConfig.isInit = false;
    rollConfig.favIcon = tab.favIconUrl;
    const hostName = urlReg.exec(url)?.[2] ?? "";

    if (!hostName) {
        rollConfig.name = "Error Website";
        rollConfig.videoSelector = {
            defaultDom: "video",
        };
        return;
    }

    for (const key of Object.keys(WEBSITE)) {
        if (hostName.includes(key)) {
            const target = WEBSITE[key];
            rollConfig.name = target.name;
            rollConfig.videoSelector = target.videoSelector;
            return;
        }
    }

    if (!rollConfig.name) {
        rollConfig.name = hostName || "Error Website";
        rollConfig.videoSelector = { defaultDom: "video" };
    }
}

function formatTime(value: string) {
    const seconds = Number(value);
    const h = Math.floor(seconds / 3600); // 小时
    const m = Math.floor((seconds % 3600) / 60); // 分钟
    const s = Math.floor(seconds % 60); // 秒

    // 如果小时为 0，不显示小时
    const formattedHours = h > 0 ? String(h).padStart(2, "0") + ":" : "";
    const formattedMinutes = String(m).padStart(2, "0");
    const formattedSeconds = String(s).padStart(2, "0");

    if (isNaN(h) || isNaN(m) || isNaN(s)) return "00:00";
    return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
}

export { initRollConfig, updateRollConfig, batchUpdateRollConfig, reloadPage, formatTime };
