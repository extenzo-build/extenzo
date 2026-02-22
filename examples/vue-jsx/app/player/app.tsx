import { defineComponent, ref, onMounted, watch } from "vue";

import Hls from "hls.js";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

import "./index.less";
import debounce from "lodash-es/debounce";
import { showLoadingToast } from "vant";
import browser from "webextension-polyfill";

export default defineComponent({
  name: "App",
  setup() {
    const videoRef = ref<HTMLVideoElement>();
    const plyrInstance = ref<Plyr | null>(null);
    const checked = ref("1");
    const url = ref("");
    const mp4Url = ref("");
    const fileUrl = ref("");
    const fileName = ref("");
    const hls = ref<Hls | null>(null);
    const currentSrc = ref("");

    const initPlyr = () => {
      if (!videoRef.value || plyrInstance.value) return;

      const video = videoRef.value;
      plyrInstance.value = new Plyr(video, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen",
        ],
        clickToPlay: true,
        settings: ["captions", "quality", "speed"],
        fullscreen: {
          enabled: true,
          fallback: true,
          iosNative: false,
        },
        ratio: "16:9", // 强制16:9比例
        hideControls: false,
        resetOnEnd: false,
        seekTime: 10,
        volume: 0.8,
        quality: {
          default: 576,
          options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240],
        },
      });

      // 确保视频加载后保持16:9比例
      video.addEventListener('loadedmetadata', () => {
        // 强制应用16:9比例样式
        const plyrContainer = video.closest('.plyr');
        if (plyrContainer) {
          plyrContainer.style.aspectRatio = '16 / 9';
          plyrContainer.style.width = '100%';
          plyrContainer.style.height = 'auto';
        }
        
        video.style.aspectRatio = '16 / 9';
        video.style.width = '100%';
        video.style.height = 'auto';
        video.style.objectFit = 'contain';
      });

      const params = new URLSearchParams(window.location.search);

      const rollType = params.get("rolltype");
      const baseUrl = params.get("url");

      if (baseUrl) {
        // 获取除了rolltype和url之外的所有参数，拼接到baseUrl后面
        const additionalParams = new URLSearchParams();
        for (const [key, value] of params.entries()) {
          if (key !== "rolltype" && key !== "url") {
            additionalParams.append(key, value);
          }
        }

        const additionalParamsString = additionalParams.toString();
        let fullUrl = baseUrl;

        // 如果有额外参数，拼接到baseUrl后面
        if (additionalParamsString) {
          const separator = baseUrl.includes("?") ? "&" : "?";
          fullUrl = baseUrl + separator + additionalParamsString;
        }

        if (rollType === "MP4") {
          mp4Url.value = fullUrl;
          checked.value = "3";
          // 自动创建播放器
          setTimeout(() => {
            onUpdate(fullUrl, true);
          }, 200);
        } else {
          // 默认为HLS类型
          url.value = fullUrl;
          checked.value = "2";
          // 自动创建播放器
          setTimeout(() => {
            onUpdate(fullUrl, false);
          }, 200);
        }
      }
    };

    const updatePlayerSrc = (src: string, isMP4 = false) => {
      if (!videoRef.value) return;

      // 清理之前的HLS实例
      if (hls.value) {
        hls.value.destroy();
        hls.value = null;
      }

      if (isMP4) {
        // MP4 直接设置 src
        videoRef.value.src = src;
      } else {
        // HLS 流媒体
        if (Hls.isSupported()) {
          hls.value = new Hls();
          hls.value.loadSource(src);
          hls.value.attachMedia(videoRef.value);
        } else if (
          videoRef.value.canPlayType("application/vnd.apple.mpegurl")
        ) {
          // 原生 HLS 支持（Safari）
          videoRef.value.src = src;
        }
      }

      currentSrc.value = src;
    };

    onMounted(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 初始化 Plyr
      setTimeout(() => {
        initPlyr();
      }, 100);
    });

    const afterRead = async (file: any) => {
      if (file) {
        showLoadingToast({
          duration: 1000,
          forbidClick: true,
          message: "loading...",
        });
        fileName.value = file.file?.name || file.name;
        const fileURL = URL.createObjectURL(file.file || file);
        fileUrl.value = fileURL;
        updatePlayerSrc(fileURL, true);
      }
    };

    const onUpdate = async (value: string, isMP4 = false) => {
      if (value) {
        showLoadingToast({
          duration: 1000,
          forbidClick: true,
          message: "loading...",
        });

        updatePlayerSrc(value, isMP4);
      }
    };

    watch(
      () => checked.value,
      async () => {
        if (checked.value === "1" && fileUrl.value) {
          await onUpdate(fileUrl.value, true);
          return;
        }

        if (checked.value === "2" && url.value) {
          await onUpdate(url.value, false); // HLS流媒体
          return;
        }

        if (checked.value === "3" && mp4Url.value) {
          await onUpdate(mp4Url.value, true); // MP4直播
          return;
        }
      }
    );

    return () => (
      <van-config-provider theme="dark">
        <main class="flex flex-row h-screen w-screen overflow-hidden">
          <div class="player-box">
            <video
              ref={videoRef}
              id="video-roll-player"
              playsinline
              preload="metadata"
              crossorigin="anonymous"
            ></video>
          </div>
          <div class="w-1/4 min-w-300px p-10 overflow-y-auto">
            <van-radio-group
              v-model={checked.value}
              shape="dot"
              direction="horizontal"
              class="mb-4"
            >
              <van-radio name="1">
                {browser.i18n.getMessage("player_local_file")}
              </van-radio>
              <van-radio name="2">
                {browser.i18n.getMessage("player_stream_url")}
              </van-radio>
              <van-radio name="3">
                {browser.i18n.getMessage("player_mp4_url") || "MP4 URL"}
              </van-radio>
            </van-radio-group>
            <div class="w-full">
              {checked.value === "2" ? (
                <van-field
                  class="w-full"
                  v-model={url.value}
                  placeholder={browser.i18n.getMessage(
                    "player_enter_stream_url"
                  )}
                  clearable
                  onUpdate:modelValue={debounce(
                    (value: string) => onUpdate(value, false),
                    400
                  )}
                />
              ) : checked.value === "3" ? (
                <van-field
                  class="w-full"
                  v-model={mp4Url.value}
                  placeholder={
                    browser.i18n.getMessage("player_enter_mp4_url") ||
                    "Enter MP4 URL..."
                  }
                  clearable
                  onUpdate:modelValue={debounce(
                    (value: string) => onUpdate(value, true),
                    400
                  )}
                />
              ) : (
                <van-uploader
                  class="w-full upload-box"
                  after-read={afterRead}
                  max-count={1}
                  accept="video/*"
                  reupload
                >
                  <div class="w-full h-200px flex flex-col justify-center items-center border-dashed border-2 border-[#a494c6] text-white rounded-4">
                    {fileName.value && (
                      <span class="mb-4">{fileName.value}</span>
                    )}
                    <span>
                      {browser.i18n.getMessage("player_upload_or_drag")}
                    </span>
                  </div>
                </van-uploader>
              )}
            </div>
          </div>
        </main>
      </van-config-provider>
    );
  },
});
