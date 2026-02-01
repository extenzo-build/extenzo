/*
 * @description: Head
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import { defineComponent, inject, watch } from "vue";

import {
  UserExclamation,
  Settings,
  Qrcode,
  BrandGithub,
  MessageCircle,
  Mail,
  AlertTriangle,
  Help,
  Star,
  UserCircle,
  UserCheck,
  Sun,
  Moon,
} from "@vicons/tabler";
import { createURL } from "src/util";
import browser from "@extenzo/utils/webextension-polyfill";
import "./index.less";
import { IRollConfig } from "src/types/type";
import { showDialog } from "vant";

export default defineComponent({
  name: "Head",
  props: {
    isShow: Boolean,
  },
  setup(props) {
    const updateEnable = inject("updateEnable") as Function;
    const rollConfig = inject("rollConfig") as IRollConfig;
    const update = inject("update") as Function;
    const user = inject("user") as any;
    const currentTheme = inject("currentTheme") as any;
    const updateTheme = inject("updateTheme") as Function;

    const toGithub = () => {
      createURL("https://github.com/gxy5202/VideoRoll");
    };
    const toSettings = () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        createURL(chrome.runtime.getURL("options/index.html"));
      }
    };

    const toHome = () => {
      createURL("https://videoroll.app");
    };

    const toFeedBack = () => {
      createURL(
        `https://docs.videoroll.app/${
          chrome.i18n.getUILanguage().includes("zh") ? "cn" : "en"
        }/docs/help`
      );
    };

    const toReviews = () => {
      const isEdge = navigator.userAgent.includes("Edg");
      createURL(
        isEdge
          ? "https://microsoftedge.microsoft.com/addons/detail/video-roll/indeeigndpaahbcegcanpmbenmkbkmmn"
          : "https://chromewebstore.google.com/detail/cokngoholafkeghnhhdlmiadlojpindm"
      );
    };

    const toIssue = () => {
      createURL("https://github.com/VideoRoll/VideoRoll/issues");
    };

    const toUser = () => {
      createURL(
        user.value
          ? `https://videoroll.app/${
              chrome.i18n.getUILanguage().includes("zh") ? "zh" : "en"
            }/dashboard`
          : `https://videoroll.app/${
              chrome.i18n.getUILanguage().includes("zh") ? "zh" : "en"
            }/signin`
      );
    };

    const setEnable = (value: boolean) => {
      rollConfig.enable = value;
      update("enable", rollConfig.enable);
      updateEnable(rollConfig.enable);
    };

    const showIframes = () => {
      showDialog({
        title: rollConfig.iframes.length
          ? browser.i18n.getMessage("head_iframes_found")
          : browser.i18n.getMessage("head_no_videos_iframes"),
        message: () => (
          <>
            {rollConfig.iframes.length
              ? rollConfig.iframes
                  ?.filter((v) => v !== "about:blank" && v.length)
                  .map((url, index) => (
                    <div class="flex flex-row items-center justify-start flex-wrap">
                      <a href={url} target="_blank">
                        <span class="text-white">{index + 1}.</span>
                        <span class="text-blue">{url}</span>
                      </a>
                    </div>
                  ))
              : ""}
          </>
        ),
        messageAlign: "left",
        theme: "round-button",
        confirmButtonText: browser.i18n.getMessage("head_dialog_close"),
        confirmButtonColor: "#7367F0",
        closeOnClickOverlay: true,
      }).then(() => {
        // on close
      });
    };

    return () => (
      <div class="video-roll-header">
        <div class="video-roll-logo" onClick={toHome}>
          {/* <img class="video-roll-logo-img" src="../../icons/icon_512.png" /> */}
        </div>
        <div class="video-roll-head-right">
          <van-space>
            {rollConfig.videoNumber === 0 && (
              <>
                <div
                  class="video-roll-setting-btn"
                  v-tooltip={browser.i18n.getMessage(
                    "head_tooltip_detect_iframe"
                  )}
                  onClick={showIframes}
                >
                  <AlertTriangle class="logo-usd-without-color text-red"></AlertTriangle>
                </div>
                <van-divider vertical></van-divider>
              </>
            )}

            <div
              class="video-roll-setting-btn"
              v-tooltip={"Github"}
              onClick={toGithub}
            >
              <BrandGithub class="logo-usd"></BrandGithub>
            </div>
            <div
              class="video-roll-setting-btn"
              v-tooltip={browser.i18n.getMessage("head_tooltip_help")}
              onClick={toFeedBack}
            >
              <Help class="logo-usd"></Help>
            </div>
            {/* <div
              class="video-roll-setting-btn"
              v-tooltip={browser.i18n.getMessage("head_tooltip_rating")}
              onClick={toReviews}
            >
              <Star class="logo-usd"></Star>
            </div> */}
            <van-divider vertical></van-divider>
            <div
              class="video-roll-setting-btn"
              v-tooltip={
                rollConfig.enable
                  ? browser.i18n.getMessage("tips_disabled")
                  : browser.i18n.getMessage("tips_enabled")
              }
            >
              <van-switch
                v-model={rollConfig.enable}
                size="12px"
                onChange={setEnable}
              ></van-switch>
            </div>
            <div
              class="video-roll-setting-btn"
              v-tooltip={currentTheme.value === 'dark' ? browser.i18n.getMessage("light_mode") : browser.i18n.getMessage("dark_mode")}
              onClick={() => updateTheme(currentTheme.value === 'dark' ? 'light' : 'dark')}
            >
              {
                currentTheme.value === 'dark' ? <Sun class="logo-usd"></Sun> : <Moon class="logo-usd"></Moon>
              }
              
            </div>
            <div
              class="video-roll-setting-btn"
              v-tooltip={browser.i18n.getMessage("tips_setting")}
              onClick={toSettings}
            >
              <Settings class="logo-usd"></Settings>
            </div>
            <van-divider vertical></van-divider>
            <div class="video-roll-feedback">
              <van-space>
                {user.value ? (
                  <div
                    class="video-roll-setting-btn"
                    onClick={toUser}
                    v-tooltip={browser.i18n.getMessage("tips_user_center")}
                  >
                    <UserCircle class="logo-usd"></UserCircle>
                  </div>
                ) : (
                  <div
                    class="video-roll-setting-btn"
                    onClick={toUser}
                    v-tooltip={browser.i18n.getMessage("tips_login")}
                  >
                    <UserExclamation class="logo-usd"></UserExclamation>
                  </div>
                )}
              </van-space>
            </div>
          </van-space>
        </div>
      </div>
    );
  },
});
