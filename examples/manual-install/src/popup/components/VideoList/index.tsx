/*
 * @description: videoList Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import {
  defineComponent,
  inject,
  ref,
  markRaw,
  watch,
  unref,
  toValue,
} from "vue";
import browser from "@extenzo/utils/webextension-polyfill";
import "./index.less";
import { IRollConfig } from "src/types/type";
import { Download, PlayerPlay, Qrcode, Link, Maximize } from "@vicons/tabler";
import Hls from "hls.js";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import QRCode from "easyqrcodejs";
import { createURL } from "src/util";
import Clipboard from "clipboard";
import { showNotify } from "vant";
import { updateHeaderRules } from "src/util/updateHeaders";

export default defineComponent({
  name: "VideoList",
  setup() {
    const rollConfig = inject("rollConfig") as IRollConfig;
    const onHoverVideo = inject("onHoverVideo") as Function;
    const videoList = inject("videoList") as any;
    const downloadSingleVideo = inject("downloadSingleVideo") as Function;
    const favIcon = inject("favIcon") as any;

    const playingUrl = ref("");
    const qrUrl = ref("");
    const player = ref<HTMLElement | null>(null);
    const plyrInstance = ref<Plyr | null>(null);

    const download = (data: any) => {
      const requestHeadersArray = JSON.parse(
        JSON.stringify(data.requestHeaders)
      );
      const headers =
        requestHeadersArray?.reduce((acc: Record<string, string>, header: any) => {
          if (["Origin", "Referer"].includes(header.name)) {
            acc[header.name] = header.value;
          }
          return acc;
        }, {} as Record<string, string>) || {};
      updateHeaderRules(headers, rollConfig.tabId, data.url).then(() => {
        downloadSingleVideo(data);
      });
    };

    const showVideo = (data: any) => {
      playingUrl.value = data.id;
      setTimeout(() => {
        const playerElement = document.querySelector(
          "#video-player"
        ) as HTMLVideoElement;

        if (!playerElement) return;

        player.value = playerElement;

        // 清理之前的 Plyr 实例
        if (plyrInstance.value) {
          plyrInstance.value.destroy();
          plyrInstance.value = null;
        }

        const requestHeadersArray = JSON.parse(
          JSON.stringify(data.requestHeaders)
        );
        const headers =
          requestHeadersArray?.reduce((acc: Record<string, string>, header: any) => {
            if (["Origin", "Referer"].includes(header.name)) {
              acc[header.name] = header.value;
            }
            return acc;
          }, {} as Record<string, string>) || {};

        // 初始化 Plyr
        plyrInstance.value = new Plyr(playerElement, {
          controls: ["play", "progress", "current-time", "mute"],
          playsinline: true,
          autoplay: true,
          ratio: '16:9',
        });

        if (data.type === "HLS") {
          if (!Hls.isSupported()) {
            updateHeaderRules(headers, rollConfig.tabId, data.url).then(() => {
              playerElement.src = data.url;
            });
          } else {
            // For more Hls.js options, see https://github.com/dailymotion/hls.js
            const hls = new Hls({ enableWorker: false });
            updateHeaderRules(headers, rollConfig.tabId, data.url).then(() => {
              hls.loadSource(data.url);
              hls.attachMedia(playerElement);
            });
          }
        } else {
          updateHeaderRules(headers, rollConfig.tabId, data.url).then(() => {
            playerElement.src = data.url;
          });
        }
      }, 100);
    };

    const onPlay = (data: any) => {
      if (
        data.id === playingUrl.value &&
        qrUrl.value === "" &&
        player.value
      ) {
        playingUrl.value = "";
        // 清理 Plyr 实例
        if (plyrInstance.value) {
          plyrInstance.value.destroy();
          plyrInstance.value = null;
        }
        document.querySelector("#video-player")?.remove();
        player.value = null;
        return;
      }
      qrUrl.value = "";
      if (player.value) {
        // 清理 Plyr 实例
        if (plyrInstance.value) {
          plyrInstance.value.destroy();
          plyrInstance.value = null;
        }
        document.querySelector("#video-player")?.remove();
        player.value = null;
        showVideo(data);
      } else {
        showVideo(data);
      }
    };

    const generateQR = (data: any) => {
      if (data.id === qrUrl.value && playingUrl.value === "" && !player.value) {
        qrUrl.value = "";
        return;
      }
      qrUrl.value = data.id;
      playingUrl.value = "";
      // 清理 Plyr 实例
      if (plyrInstance.value) {
        plyrInstance.value.destroy();
        plyrInstance.value = null;
      }
      document.querySelector("#video-player")?.remove();
      setTimeout(() => {
        const dom = document.getElementById("video-qr-code");
        (dom as HTMLElement).innerHTML = "";
        const qrcode = new QRCode(document.getElementById("video-qr-code"), {
          text: data.url,
          width: 180,
          height: 180,
          correctLevel: QRCode.CorrectLevel.M, // L, M, Q, H
        });
      }, 100);
    };

    const showQR = (data: any) => {
      if (player.value) {
        // 清理 Plyr 实例
        if (plyrInstance.value) {
          plyrInstance.value.destroy();
          plyrInstance.value = null;
        }
        document.querySelector("#video-player")?.remove();
        player.value = null;
        generateQR(data);
      } else {
        generateQR(data);
      }
    };

    const openPlayer = (data: any) => {
      createURL(
        chrome.runtime.getURL(
          `player/player.html?url=${data.url}&rolltype=${data.type}`
        )
      );
    };

    const copyLink = (data: any) => {
      Clipboard.copy(data.url);
      showNotify({
        type: "success",
        message: browser.i18n.getMessage("videolist_copy_success"),
        duration: 1000,
      });
    };

    return () => (
      <div>
        <div>
          <van-notice-bar
            scrollable={false}
            left-icon={(favIcon.value as string) || "tv-o"}
            color="var(--video-roll-logo-usd-color)"
            background="transparent"
            text={rollConfig.document?.title}
          />
        </div>

        <div class="mb-2">
          <span class="text-gray-400">
            {browser.i18n.getMessage("videolist_no_video_detected")}
          </span>
          <a
            href={`https://videoroll.app/${
              chrome.i18n.getUILanguage().includes("zh") ? "zh" : "en"
            }/download-video`}
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue"
          >
            {browser.i18n.getMessage("videolist_video_download")}
          </a>
        </div>
        {videoList.value?.length ? (
          videoList.value.map((v: any) => (
            <div
              class="video-item"
              onMouseleave={() => onHoverVideo(v.id, false)}
              onMouseenter={() => onHoverVideo(v.id, true)}
            >
              <div class="video-info">
                <div class="video-info-box">
                  <div class="video-info-name">
                    {v.title || rollConfig.document?.title || v.url}
                  </div>
                </div>

                <div class="video-tags">
                  <div>
                    <van-tag type="primary">{v.type}</van-tag>
                    {/* <span class="video-type">{v.type}</span> */}

                    {v.size ? (
                      <van-tag plain color="#1989fa">
                        {v.size}
                      </van-tag>
                    ) : null}
                    {typeof v.duration === "string" ? (
                      <van-tag plain type="success">
                        {v.duration}
                      </van-tag>
                    ) : null}
                    {v.width && v.height ? (
                      <van-tag plain type="success">
                        {`${v.width}x${v.height}`}
                      </van-tag>
                    ) : null}
                    {v.mediaType ? (
                      <van-tag plain type="warning">
                        {v.mediaType}
                      </van-tag>
                    ) : null}
                    {/* {v.kbps ? (
                                            <van-tag plain type="success">
                                                {`${v.kbps}kbps`}
                                            </van-tag>
                                        ) : null} */}
                  </div>
                </div>
                <div class="video-action">
                  <span
                    class="list-icon"
                    onClick={() => download(v)}
                  >
                    <Download />
                  </span>
                  <span class="list-icon" onClick={() => openPlayer(v)}>
                    <Maximize />
                  </span>

                  <span class="list-icon" onClick={() => onPlay(v)}>
                    <PlayerPlay />
                  </span>
                  <span class="list-icon" onClick={() => showQR(v)}>
                    <Qrcode />
                  </span>
                  <span class="list-icon" onClick={() => copyLink(v)}>
                    <Link />
                  </span>
                </div>
              </div>
              <div class="extra-info">
                {playingUrl.value === v.id ? (
                  <video
                    id="video-player"
                    playsinline
                    autoplay
                    preload="auto"
                    crossorigin="anonymous"
                  ></video>
                ) : null}
                {qrUrl.value === v.id ? <div id="video-qr-code"></div> : null}
              </div>
            </div>
          ))
        ) : (
          <div>
            <van-empty
              image="error"
              description={browser.i18n.getMessage("tips_empty")}
            />
          </div>
        )}
      </div>
    );
  },
});
