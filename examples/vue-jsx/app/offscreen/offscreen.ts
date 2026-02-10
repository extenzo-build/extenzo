import AudioController from "app/content/classes/AudioController";
import { ActionType } from "app/types/type.d";
import { sendRuntimeMessage } from "app/util";

const tabs = new Map();

chrome.runtime.onMessage.addListener(async (e, b, send) => {
  if ("offscreen" !== e.target) {
    send("audio");
    return;
  }

  if (
    e.type === ActionType.UPDATE_STREAM_AUDIO &&
    !tabs.has(e.rollConfig.tabId)
  ) {
    try {
      tabs.set(
        e.rollConfig.tabId,
        new AudioController(
          {
            type: "stream",
            streamId: e.streamId,
          },
          e.rollConfig.tabId,
          e.rollConfig,
          (error: any, tabId: number) => {
            tabs.delete(tabId);
            // notify popup: stream-mode audio failed
            if (error) {
              sendRuntimeMessage(tabId, {
                type: ActionType.AUDIO_FAILED,
                message: "音频获取失败，请在设置中更换音频获取方式后重试",
              });
            }
          }
        )
      );
    } catch (err) {
      tabs.delete(e.rollConfig.tabId);
      console.error("err", err);
    }
  }

  if (
    e.type === ActionType.UPDATE_STREAM_AUDIO &&
    tabs.has(e.rollConfig.tabId)
  ) {
    const audioController = tabs.get(e.rollConfig.tabId);
    audioController.update(e.rollConfig);
  }

  if (e.type === ActionType.DELETE_AUDIO && tabs.has(e.tabId)) {
    const audioController = tabs.get(e.tabId);
    audioController.reset();
  }

  send("audio");
});
