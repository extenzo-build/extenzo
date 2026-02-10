import {
  defineComponent,
  ref,
  onMounted,
  reactive,
  computed,
  watch,
  onUnmounted,
  nextTick,
} from "vue";
// import Header from "./components/Header";
// import Navbar from "./components/Navbar";
// import AdPanel from "./components/AdPanel";

import "./index.less";
import { M3U8Downloader } from "./class/M3u8downloader";
import browser from "webextension-polyfill";
import isEmpty from "lodash-es/isEmpty";
// import { OPTIONS_MENU } from "./config";
// import Panel from "./components/Panel";

export default defineComponent({
  name: "App",
  setup() {
    const segments = ref<any[]>([]);
    const downloader = ref<any>();
    const videoInfo = ref<any>({});
    const downloadType = ref("ts"); // 1: ts, 2: mp4
    const logHistory = ref<
      {
        type: "start" | "end" | "error" | "finish";
        data: number;
        url: string;
        currentIndex: number;
        totalSegments: number;
        fileSize: number;
        error?: string; // 添加可选的错误信息字段
      }[]
    >([]);

    const logContainerRef = ref<HTMLDivElement | null>(null);

    const progress = reactive({
      percentage: 0,
      downloaded: 0,
      total: 0,
      totalBytes: 0,
    });

    const url = ref<string>("");

    const downloadId = ref("");
    const isFinished = ref(false);

    const isButtonEnable = computed(() => {
      return progress.percentage >= 100 && isFinished.value;
    });

    // 计算推荐的格式
    const recommendedFormat = computed(() => {
      if (!downloader.value || !downloader.value.segments) return null;
      const hasMp4Segments = downloader.value.segments.some(
        (s: any) => s.format === "mp4"
      );
      return hasMp4Segments ? "mp4" : null;
    });

    // 格式提示文本
    const formatHint = computed(() => {
      if (recommendedFormat.value === "mp4") {
        return browser.i18n.getMessage("format_hint_mp4_detected");
      }
      return "";
    });

    // Helper function to format bytes
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    onMounted(async () => {
      const params = new URLSearchParams(window.location.search);
      downloadId.value = params.get("downloadId") as string;

      if (downloadId.value) {
        const data = await chrome.storage.session.get([downloadId.value]);
        videoInfo.value = data[downloadId.value];

        if (isEmpty(videoInfo.value)) return;

        videoInfo.value.url = videoInfo.value.url || "";
        url.value = videoInfo.value.url;
        downloader.value = new M3U8Downloader({
          url: videoInfo.value.url,
          log: true,
          // outputMp4: false,
          onParsed(data) {
            segments.value = data.map((item) => ({ ...item }));
          },
          onUpdated(item, index, data) {
            segments.value = data.map((item) => ({ ...item }));
          },
          onProgress({
            type,
            data,
            url,
            currentIndex,
            totalSegments,
            fileSize,
            error,
          }) {
            logHistory.value.push({
              type,
              data,
              url,
              currentIndex,
              totalSegments,
              fileSize,
              error, // 添加错误信息到日志历史
            });

            progress.percentage = data;
            progress.downloaded = currentIndex;
            progress.total = totalSegments;
            progress.totalBytes = fileSize;
            document.title = `${progress.percentage.toFixed(2)}% - VideoRoll`;
          },
          onFinish() {
            isFinished.value = true;
            logHistory.value.push({
              type: "finish",
              data: 100,
              url: "",
              currentIndex: segments.value.length,
              totalSegments: segments.value.length,
              fileSize: progress.totalBytes,
            });
          },
          videoInfo: JSON.parse(JSON.stringify(videoInfo.value)),
        });

        // 开始下载
        downloader.value.start();
      }
    });

    onUnmounted(() => {
      chrome.storage.session.remove([downloadId.value]);
    });

    watch(
      () => logHistory.value,
      () => {
        nextTick(() => {
          // 自动滚动到底部
          scrollToBottom();
        });
      },
      { deep: true }
    );

    // 监听segments变化，自动切换到推荐格式
    watch(
      () => recommendedFormat.value,
      (newFormat) => {
        if (newFormat === "mp4" && downloadType.value === "ts") {
          console.log("检测到MP4片段，自动切换到MP4格式");
          downloadType.value = "mp4";
        }
      }
    );

    // 点击失败的片段进行重新下载
    function handleErrorRetry(index: number) {
      if (segments.value[index].status !== "success") {
        downloader.value.downloadTsByIndex(index);
      }
    }

    const downloadTS = async () => {
      const blob = await downloader.value.getTSData();
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url,
        filename: `${downloader.value.filename}.ts`,
      });
    };

    const downloadMP4 = async () => {
      const blob = await downloader.value.getMP4Data();
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url,
        filename: `${downloader.value.filename}.mp4`,
      });
    };

    const downloadVideo = async () => {
      // 检查是否检测到MP4格式的片段
      const hasMp4Segments = downloader.value.segments.some(
        (s: any) => s.format === "mp4"
      );

      console.log("下载视频 - 格式检测:", {
        downloadType: downloadType.value,
        hasMp4Segments,
        outputMp4: downloader.value.outputMp4,
      });

      // 如果检测到MP4片段，强制使用MP4格式
      if (hasMp4Segments) {
        console.log("检测到fMP4片段，使用增强MP4格式下载");

        // 对于 fMP4，我们可能需要特殊处理
        try {
          await downloadMP4();
        } catch (error) {
          console.error("MP4下载失败，尝试直接下载原始数据:", error);

          // 如果 MP4 处理失败，提供原始数据下载选项
          const rawBlob = new Blob(downloader.value.finishSegments, {
            type: "application/octet-stream",
          });
          const url = URL.createObjectURL(rawBlob);
          chrome.downloads.download({
            url,
            filename: `${downloader.value.filename}_raw.mp4`,
          });
        }
      } else if (downloadType.value === "ts") {
        console.log("使用TS格式下载");
        await downloadTS();
      } else {
        console.log("使用MP4格式下载");
        await downloadMP4();
      }
    };

    // 自动滚动到底部的函数

    const scrollToBottom = () => {
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
      }
    };

    // 预览视频功能：统一转成 MP4 进行预览
    async function previewVideo() {
      try {
        let blob: Blob = await downloader.value.getMP4Data();
        // 确保 MIME 为 video/mp4，兼容某些环境的播放识别
        if (!blob || blob.type !== "video/mp4") {
          blob = new Blob([blob], { type: "video/mp4" });
        }
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, "_blank");
      } catch (error) {
        console.error("预览失败:", error);
      }
    }

    return () => (
      <van-config-provider theme="dark">
        {/* <Header></Header> */}
        <main class="pb-20 pt-2 overflow-y-auto">
          <div class="download-page w-xl mx-auto p-10 bg-[#26262a] rounded-xl">
            <div class="flex items-center mb-2">
              <img src={videoInfo.value?.favIcon}></img>
              <h3 class="text-white text-xl ml-4">{videoInfo.value?.title}</h3>
            </div>

            <div class="w-full flex flex-col text-xl divide-y">
              <div class="w-full text-gray-200 whitespace-nowrap border-b border-x-0 border-t-0 border-[#3a3a3c] border-solid pb-2">
                HLS URL
              </div>
              <div class="w-full text-lg text-gray-200 break-all py-2">
                {videoInfo.value?.url}
              </div>
            </div>

            <div class="w-full flex flex-col text-xl divide-y mt-4">
              <div class="w-full text-gray-200 whitespace-nowrap border-b border-x-0 border-t-0 border-[#3a3a3c] border-solid pb-2">
                {browser.i18n.getMessage("download_format")}
              </div>
              <div class="w-full text-gray-200 break-all py-2">
                <van-radio-group
                  v-model={downloadType.value}
                  shape="dot"
                  direction="horizontal"
                >
                  <van-radio name="ts">ts</van-radio>
                  <van-radio name="mp4">mp4</van-radio>
                </van-radio-group>
                {formatHint.value && (
                  <div class="text-yellow-400 text-sm mt-2">
                    💡 {formatHint.value}
                  </div>
                )}
              </div>
            </div>

            <div class="w-full mt-4">
              <van-progress
                class="w-full"
                percentage={progress.percentage}
                track-color="#2d2e31"
                show-pivot={false}
                stroke-width="16"
                color="linear-gradient(to right, #be99ff, #7232dd)"
              ></van-progress>
              <div class="download-info mt-1 flex flex-row justify-between">
                <div class="text-white text-md w-[100px]">
                  {browser.i18n.getMessage("download_size")}:{" "}
                  {formatBytes(progress.totalBytes)}
                </div>
                <div class="text-white text-md">
                  {progress.percentage.toFixed(2)}%
                </div>
                <div class="text-white text-md">
                  {browser.i18n.getMessage("download_segments")}:{" "}
                  {progress.downloaded}/{progress.total}
                </div>
              </div>
            </div>
            <div
              ref={logContainerRef}
              class="w-full mt-4 overflow-y-auto max-h-60 box-border px-4 border border-solid border-[#3a3a3c] rounded-lg"
            >
              {logHistory.value.map((item, index) =>
                item.type === "start" ? (
                  <div
                    key={index}
                    class="flex text-gray-200 text-sm mt-2 pb-2 border border-x-0 border-t-0 border-solid border-[#3a3a3c]"
                  >
                    <span class="mr-4">[{item.currentIndex}]</span>
                    <span class="mr-4 w-[340px] break-all">
                      Start fetch {item.url}
                    </span>
                    <span class="mr-4">{formatBytes(item.fileSize)}</span>
                    <span>{item.data.toFixed(2)}%</span>
                  </div>
                ) : item.type === "end" ? (
                  <div
                    key={index}
                    class="flex text-green-400 text-sm mt-2 pb-2 border border-x-0 border-t-0 border-solid border-[#3a3a3c]"
                  >
                    <span class="mr-4">[{item.currentIndex}]</span>
                    <span class="mr-4 w-[340px] break-all">
                      Finished fetch {item.url}
                    </span>
                    <span class="mr-4">{formatBytes(item.fileSize)}</span>
                    <span>{item.data.toFixed(2)}%</span>
                  </div>
                ) : item.type === "error" ? (
                  <div
                    key={index}
                    class="flex text-red-400 text-sm mt-2 pb-2 border border-x-0 border-t-0 border-solid border-[#3a3a3c]"
                  >
                    <span class="mr-4">[{item.currentIndex}]</span>
                    <span class="mr-4 w-[340px] break-all">
                      {item.error ? item.error : `Error fetch ${item.url}`}
                    </span>
                    <span class="mr-4">{formatBytes(item.fileSize)}</span>
                    <span>{item.data.toFixed(2)}%</span>
                  </div>
                ) : (
                  <div
                    key={index}
                    class="flex text-green-400 text-sm mt-2 pb-2 border border-x-0 border-t-0 border-solid border-[#3a3a3c]"
                  >
                    🎉 完成所有片段下载
                  </div>
                )
              )}
            </div>
            <div class="w-full mt-4 flex flex-row gap-4">
              <van-button
                class="flex-1 mt-4"
                disabled={!isButtonEnable.value}
                type="primary"
                size="large"
                rounded
                onClick={downloadVideo}
              >
                {browser.i18n.getMessage("download_video_btn")}
              </van-button>
              <van-button
                class="flex-1 mt-4"
                disabled={!isButtonEnable.value}
                type="success"
                size="large"
                rounded
                onClick={previewVideo}
              >
                {browser.i18n.getMessage("preview_btn")}
              </van-button>
            </div>
          </div>
        </main>
      </van-config-provider>
    );
  },
});
