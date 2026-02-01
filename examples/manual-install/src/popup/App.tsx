import {
  defineComponent,
  ref,
  onMounted,
  provide,
  watch,
  onBeforeUnmount,
} from "vue";
import browser from "@extenzo/utils/webextension-polyfill";
import Head from "./components/Head/index.js";
import Footer from "./components/Footer/index.js";
import GridPanel from "./components/GridPanel/index.js";
import { useConfig } from "../use/index.js";
import { initRollConfig, updateRollConfig, reloadPage, batchUpdateRollConfig } from "./utils/index.js";
import { clone, getSessionStorage, sendTabMessage } from "../util/index.js";
import { ActionType } from "../types/type.d.js";
import { Close } from "@vicons/ionicons5";

import "./index.less";
import { showToast } from "vant";

export default defineComponent({
  name: "App",
  setup() {
    const isShow = ref(false);
    const tabId = ref(0);
    const videoList = ref([]);
    const realVideo = ref();
    const user = ref();
    const favIcon = ref("");
    const rate = ref(5);
    const rateShow = ref(false);
    const disableShowRating = ref(false);
    const currentTheme = ref("dark");

    // 存储监听器引用以便清理
    let messageListener:
      | ((
          info: any,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: any) => void
        ) => void)
      | null = null;

    /**
     * open settings panel
     */
    const onOpenSetting = (e: Event) => {
      isShow.value = !isShow.value;
    };

    // current website config
    const rollConfig = useConfig();

    const onHoverVideo = (id: string, isIn: boolean) => {
      sendTabMessage(rollConfig.tabId, {
        id,
        type: ActionType.ON_HOVER_VIDEO,
        isIn,
      });
    };

    const updateVideoCheck = (ids: string[]) => {
      sendTabMessage(rollConfig.tabId, {
        ids,
        type: ActionType.UPDATE_VIDEO_CHECK,
      });
    };

    const updateEnable = () => {
      sendTabMessage(rollConfig.tabId, {
        rollConfig: clone(rollConfig),
        type: ActionType.UPDATE_ENABLE,
      });
    };

    const capture = () => {
      sendTabMessage(rollConfig.tabId, {
        rollConfig: clone(rollConfig),
        type: ActionType.CAPTURE,
      });
    };

    const startRecord = () => {
      sendTabMessage(rollConfig.tabId, {
        rollConfig: clone(rollConfig),
        type: ActionType.START_RECORD,
      });
    };

    const stopRecord = () => {
      sendTabMessage(rollConfig.tabId, {
        rollConfig: clone(rollConfig),
        type: ActionType.STOP_RECORD,
      });
    };

    const advancedPictureInPicture = () => {
      sendTabMessage(rollConfig.tabId, {
        rollConfig: clone(rollConfig),
        type: ActionType.ADVANCED_PICTURE_IN_PICTURE,
      });
    };

    const downloadSingleVideo = (videoInfo: any) => {
      sendTabMessage(rollConfig.tabId, {
        rollConfig: clone(rollConfig),
        type: ActionType.DOWNLOAD_SINGLE_VIDEO,
        videoInfo,
        favIcon: favIcon.value,
      });
    };

    const updateTheme = (theme: string) => {
      currentTheme.value = theme;
      chrome.storage.local.set({ "videoroll-theme": theme });
    };

    provide("currentTheme", currentTheme);
    provide("updateTheme", updateTheme);
    provide("rollConfig", rollConfig);
    provide("update", updateRollConfig.bind(null, rollConfig));
    provide("batchUpdate", batchUpdateRollConfig.bind(null, rollConfig));
    provide("onOpenSetting", onOpenSetting);
    provide("videoList", videoList);
    provide("favIcon", favIcon);
    provide("onHoverVideo", onHoverVideo);
    provide("updateVideoCheck", updateVideoCheck);
    provide("updateEnable", updateEnable);
    provide("capture", capture);
    provide("startRecord", startRecord);
    provide("stopRecord", stopRecord);
    provide("advancedPictureInPicture", advancedPictureInPicture);
    provide("user", user);
    provide("downloadSingleVideo", downloadSingleVideo);
    provide("realVideo", realVideo);

    watch(
      () => tabId.value,
      (value: number) => {
        if (!value) return;
        const config = getSessionStorage(value);

        Object.keys(config).forEach((key) => {
          if (key in rollConfig && key !== "tabId") {
            rollConfig[key] = config[key];
          }
        });
      }
    );

    const showRatingPopup = () => {
      rateShow.value = true;
    };

    const onDisableShowRatingChange = (value: boolean) => {
      chrome.storage.sync.set({ disabledRating: value, popupOpenCount: -9999 });
    };

    const checkRateInfo = async (rateInfo: any) => {
      const { popupOpenCount, hasRated, disabledRating } = rateInfo;
      if (
        disabledRating ||
        hasRated ||
        (typeof popupOpenCount === "number" && popupOpenCount < 0)
      ) {
        return;
      }

      if (popupOpenCount >= 8 && !hasRated && !disabledRating) {
        showRatingPopup(); // 弹出评分提示
        return;
      }

      if (
        !hasRated &&
        !disabledRating &&
        (popupOpenCount < 8 || !popupOpenCount)
      ) {
        // 更新打开次数
        browser.storage.sync.set({
          popupOpenCount: (popupOpenCount || 0) + 1,
        });
        return;
      }
    };

    const getTheme = () => {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "dark";
      }
      return "light";
    };

    /**
     * 当打开时就获取当前网站的视频信息
     * 添加样式
     */
    onMounted(() => {
      const queryOptions = { active: true, currentWindow: true };

      chrome.storage.local.get("videoroll-theme").then((theme) => {
        currentTheme.value = theme["videoroll-theme"] ?? getTheme();
      });

      // 定义监听器函数
      messageListener = (info, b, c) => {
        const {
          type,
          rollConfig: config,
          text,
          imgData,
          muted,
          iframes,
          windowConfig,
          user: userInfo,
          downloadList,
          videoList: realVideoList,
          rateInfo,
        } = info;

        if (info.tabId !== tabId.value) {
          c("not current tab");
          return;
        }

        switch (type) {
          case ActionType.UPDATE_STORAGE:
            Object.keys(config).forEach((key) => {
              rollConfig[key] = config[key];
            });
            if (rateInfo) {
              checkRateInfo(rateInfo);
            }
            break;
          case ActionType.UPDATE_BADGE:
            rollConfig.videoNumber = Number(text);
            realVideo.value = realVideoList.find((v: any) => v.isReal);
            break;
          case ActionType.UPDATE_IFRAMES:
            rollConfig.iframes = iframes;
            break;
          case ActionType.ADVANCED_PICTURE_IN_PICTURE:
            browser.windows.create({
              tabId: rollConfig.tabId,
              type: "popup",
              width: windowConfig.width,
              height: windowConfig.height,
              left: windowConfig.leftPosition,
              top: windowConfig.topPosition,
              focused: true,
            });
            break;
          case ActionType.RECORD_INFO:
            rollConfig.recordStatus = config.recordStatus;
            rollConfig.recordInfo = config.recordInfo;
            rollConfig.recordTime = config.recordTime;
            break;
          case ActionType.USER_INFO:
            user.value = userInfo?.user;
            break;
          case ActionType.GET_DOWNLOAD_LIST:
            videoList.value = downloadList;
            break;
          case ActionType.AUDIO_FAILED:
            try {
              const msg = info?.message || browser.i18n.getMessage('audio_failed_tips') || '音频获取失败，请在设置中更换音频获取方式后重试';
              showToast({ type: 'fail', message: msg, duration: 3000 });
            } catch {}
            break;
          default:
            break;
        }

        c("update");
      };

      // 避免卡顿
      setTimeout(() => {
        browser.tabs.query(queryOptions).then(([tab]) => {
          tabId.value = tab.id as number;
          initRollConfig(rollConfig, tab);
          if (tab.favIconUrl) {
            favIcon.value = tab.favIconUrl;
          }

          sendTabMessage(rollConfig.tabId, {
            rollConfig: clone(rollConfig),
            type: ActionType.ON_MOUNTED,
          }).then(() => {
            // sendTabMessage(rollConfig.tabId, {
            //   rollConfig: clone(rollConfig),
            //   type: ActionType.AUDIO_CAPTURE,
            // });
          });
        });
      });

      // 添加监听器
      chrome.runtime.onMessage.addListener(messageListener);
    });

    // 组件卸载前清理监听器
    onBeforeUnmount(() => {
      if (messageListener) {
        chrome.runtime.onMessage.removeListener(messageListener);
        messageListener = null;
      }
    });

    const renderComponent = () => {
      if (rollConfig.enable) {
        return <GridPanel></GridPanel>;
      }

      return (
        <div class="empty-box h-full">
          <Close class="logo-empty" />
          <div>{browser.i18n.getMessage("tips_disabled")}</div>
        </div>
      );
    };

    return () => (
      <div
        class={
          rollConfig.enable ? "video-roll-wrapper" : "video-roll-wrapper-empty"
        }
      >
        <van-config-provider
          theme={currentTheme.value}
          class={rollConfig.enable ? "" : "video-roll-provider-empty"}
        >
          <Head class="video-roll-wrapper-head" isShow={isShow.value}></Head>
          <main
            class={
              rollConfig.enable ? "video-roll-main" : "video-roll-main-empty"
            }
          >
            <div
              class={
                rollConfig.enable
                  ? "video-roll-content"
                  : "video-roll-content-empty"
              }
            >
              {renderComponent()}
            </div>
          </main>
          {rollConfig.enable && <Footer></Footer>}
          <van-dialog
            v-model:show={rateShow.value}
            title={browser.i18n.getMessage("rating_dialog_title")}
            showCancelButton={true}
            confirmButtonText={browser.i18n.getMessage("rating_submit_button")}
            cancelButtonText={browser.i18n.getMessage("rating_close_button")}
            onConfirm={() => {
              rateShow.value = false;
              browser.storage.sync.set({
                hasRated: true,
                popupOpenCount: -9999,
              });
              const isEdge = navigator.userAgent.includes("Edg");
              if (rate.value < 4) {
                browser.tabs.create({
                  url: `https://videoroll.app/${
                    chrome.i18n.getUILanguage().includes("zh") ? "zh" : "en"
                  }/rate-feedback?version=${
                    chrome.runtime.getManifest()?.version
                  }&rate=${rate.value}`,
                });
              } else {
                browser.tabs.create({
                  url: isEdge
                    ? "https://microsoftedge.microsoft.com/addons/detail/video-roll/indeeigndpaahbcegcanpmbenmkbkmmn"
                    : "https://chromewebstore.google.com/detail/cokngoholafkeghnhhdlmiadlojpindm",
                });
              }
            }}
            closeOnClickOverlay={true}
            align="center"
          >
            <div class="mt-2 mb-4">
              <van-rate
                v-model={rate.value}
                size="25"
                color="#ffd21e"
              ></van-rate>
              <van-checkbox
                class="justify-center mt-3"
                v-model={disableShowRating.value}
                shape="square"
                onChange={onDisableShowRatingChange}
              >
                {browser.i18n.getMessage("rating_no_show_again")}
              </van-checkbox>
            </div>
          </van-dialog>
        </van-config-provider>
      </div>
    );
  },
});
