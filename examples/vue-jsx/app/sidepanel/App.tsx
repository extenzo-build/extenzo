import { ActionType } from "app/types/type.d";
import { sendRuntimeMessage, sendTabMessage } from "app/util";
import { marked } from "marked";
import {
  BrandChrome,
  Check,
  CircleX,
  Copy,
  Download,
  Eye,
  FileDownload,
  FileText,
} from "@vicons/tabler";
import { defineComponent, ref, onMounted, watch, nextTick } from "vue";
import { showDialog } from "vant";
import Clipboard from "clipboard";
import { showNotify } from "vant";
import browser from 'webextension-polyfill'

// Summary Type 选项
const summaryTypeOptions = [
  { value: "key-points", label: browser.i18n.getMessage("summary_type_key_points") || "要点摘要" },
  { value: "teaser", label: browser.i18n.getMessage("summary_type_teaser") || "重点摘要" },
  { value: "headline", label: browser.i18n.getMessage("summary_type_headline") || "标题摘要" },
  { value: "tldr", label: browser.i18n.getMessage("summary_type_tldr") || "简要摘要" },
];

// Length 选项
const lengthOptions = [
  { value: "short", label: browser.i18n.getMessage("summary_length_short") || "简短" },
  { value: "medium", label: browser.i18n.getMessage("summary_length_medium") || "中等" },
  { value: "long", label: browser.i18n.getMessage("summary_length_long") || "详细" },
];

export default defineComponent({
  name: "App",
  setup() {
    // 兼容 Chrome/Firefox i18n
    const browser = (window as any).browser || (window as any).chrome;

    const summary = ref<string>("");
    const loading = ref(false);
    const status = ref("loading");
    const error = ref<string | null>(null);
    const done = ref(false);
    const summarizing = ref(false);
    const url = ref("");
    const title = ref("");
    const subtitle = ref("");
    const summaryContainerRef = ref<HTMLElement | null>(null);

    // 添加下拉框的选中值
    const summaryType = ref<string>("key-points");
    const summaryLength = ref<string>("medium");
    const inputSize = ref<number>(5000); // 输入大小，单位为字节

    // 自动滚动到底部的函数
    const scrollToBottom = () => {
      if (summaryContainerRef.value) {
        summaryContainerRef.value.scrollTop =
          summaryContainerRef.value.scrollHeight;
      }
    };

    // 监听摘要内容变化，自动滚动
    watch(
      () => summary.value,
      () => {
        // 只有在生成过程中才自动滚动
        if (!done.value && summary.value) {
          nextTick(() => {
            scrollToBottom();
          });
        }
      }
    );

    const startSummary = async () => {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error(browser.i18n.getMessage("error_no_tab") || "无法获取当前标签页");

      const videoId = tab.url?.match(/v=([^&]+)/)?.[1];

      sendRuntimeMessage(tab.id, {
        type: ActionType.GET_SUBTITLE_URL,
        videoId,
        tabId: tab.id,
      });
    };

    // 请求生成摘要
    const init = async () => {
      // loading.value = true;
      error.value = null;
      done.value = false;
      summary.value = "";

      try {
        // 获取当前标签页
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) throw new Error(browser.i18n.getMessage("error_no_tab") || "无法获取当前标签页");

        chrome.runtime.onMessage.addListener((a, b, send) => {
          const { subtitleUrl, type, tabId, payload, rollConfig } = a;

          if (
            tabId !== tab.id ||
            ![
              ActionType.GET_SUBTITLE_URL_FROM_BACKGROUND,
              ActionType.SUMMARIZING,
              ActionType.SUMMARIZER_AVAILABLE,
              ActionType.SUMMARIZER_UNAVAILABLE,
              ActionType.SUMMARIZER_DOWNLOADABLE,
              ActionType.SUMMARIZER_DOWNLOADING,
              ActionType.SUMMARIZER_ERROR,
              ActionType.SUMMARIZE_DONE,
              ActionType.GET_SUMMARIZER_INFO,
              ActionType.GET_SUBTITLE,
            ].includes(type)
          )
            return;

          switch (type) {
            case ActionType.GET_SUBTITLE_URL_FROM_BACKGROUND: {
              if (subtitleUrl) {
                loading.value = true;
                sendTabMessage(tabId, {
                  type: ActionType.PARSE_SUBTITLE,
                  subtitleUrl,
                  tabId,
                  summaryOptions: {
                    type: summaryType.value,
                    length: summaryLength.value,
                    size: inputSize.value,
                  },
                });
              } else {
                console.warn("No subtitle URL received");
                error.value = browser.i18n.getMessage("error_no_subtitle") || "未获取到字幕，请确认打开youtube字幕功能";
              }
              break;
            }
            case ActionType.GET_SUMMARIZER_INFO: {
              title.value = rollConfig.document.title || (browser.i18n.getMessage("summary_title") || "视频摘要");
              break;
            }
            case ActionType.GET_SUBTITLE: {
              subtitle.value = payload.subtitle;
              break;
            }
            case ActionType.SUMMARIZING:
              error.value = null;
              loading.value = false;
              done.value = false;
              summarizing.value = true;
              summary.value = marked.parse(
                payload.text.replace(
                  /^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/,
                  ""
                )
              ) as string;

              // 更新内容后自动滚动
              nextTick(() => {
                scrollToBottom();
              });
              break;
            case ActionType.SUMMARIZE_DONE:
              loading.value = false;
              done.value = true;
              summarizing.value = false;
              nextTick(() => {
                scrollToBottom();
              });
              break;
            case ActionType.SUMMARIZER_AVAILABLE:
              status.value = "available";
              break;
            case ActionType.SUMMARIZER_UNAVAILABLE:
              status.value = "unavailable";
              break;
            case ActionType.SUMMARIZER_DOWNLOADABLE:
              status.value = "downloadable";
              break;
            case ActionType.SUMMARIZER_DOWNLOADING:
              status.value = "downloading";
              break;
            case ActionType.SUMMARIZER_ERROR:
              error.value = payload.error || (browser.i18n.getMessage("error_summary_failed") || "摘要生成失败");
              summarizing.value = false;
              loading.value = false;
              break;
            default:
              break;
          }

          send("success");
        });
        sendTabMessage(tab.id, {
          type: ActionType.CHECK_SUMMARIZER,
          tabId: tab.id,
        });
      } catch (err) {
        error.value = err instanceof Error ? err.message : (browser.i18n.getMessage("error_request_failed") || "请求失败");
        loading.value = false;
      }
    };

    const downloadModel = async () => {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error(browser.i18n.getMessage("error_no_tab") || "无法获取当前标签页");

      // 发送下载模型请求
      sendTabMessage(tab.id, {
        type: ActionType.DOWNLOAD_SUMMARIZER,
        tabId: tab.id,
      });
    };

    const openSubtitleDialog = () => {
      showDialog({
        title: browser.i18n.getMessage("subtitle_dialog_title") || "字幕内容",
        message: subtitle.value || (browser.i18n.getMessage("subtitle_dialog_empty") || "暂无字幕内容"),
        theme: "round-button",
        closeOnClickOverlay: true,
        closeOnPopstate: true,
        confirmButtonText: "Copy",
        confirmButtonColor: "#7367F0",
        messageAlign: "left",
      }).then(() => {
        Clipboard.copy(subtitle.value);
        showNotify({
          type: "success",
          message: browser.i18n.getMessage("notify_copied") || "copied successfully",
          duration: 1000,
        });
      });
    };

    onMounted(() => {
      init();
    });

    return () => (
      <van-config-provider theme="dark" class="h-full">
        <main class="flex flex-col h-full p-4 justify-between box-border">
          <div class="font-bold">{title.value}</div>
          <div class="flex-1 relative overflow-y-hidden">
            {/* 顶部渐变遮罩 */}
            <div
              class="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10"
              style="background: linear-gradient(to bottom, #282828, transparent);"
            ></div>

            <div
              ref={summaryContainerRef}
              class="flex-1 h-full overflow-y-auto scroll-smooth px-4 py-6"
              style="mask: linear-gradient(to bottom, transparent 0px, black 24px, black calc(100% - 24px), transparent 100%); -webkit-mask: linear-gradient(to bottom, transparent 0px, black 24px, black calc(100% - 24px), transparent 100%);"
            >
              <div class="flex items-center gap-1 text-md text-gray-500">
                <BrandChrome class="w-5 h-5 text-orange-500"></BrandChrome>
                {browser.i18n.getMessage("chrome_version_tip") || "最低要求chrome 138 beta版本"}
              </div>
              
              {status.value === "loading" ? (
                <van-loading size="24px" vertical>
                  {browser.i18n.getMessage("model_checking") || "检测模型是否可用..."}
                </van-loading>
              ) : status.value === "available" ? (
                <div class="flex items-center gap-1 mt-2">
                  <Check class="w-5 h-5 text-green-500" />
                  {browser.i18n.getMessage("model_ready") || "模型已准备完毕"}
                </div>
              ) : status.value === "downloadable" ? (
                <>
                  <div class="flex items-center gap-1">
                    <Check class="w-5 h-5 text-green-500" />
                    {browser.i18n.getMessage("model_downloadable") || "浏览器模型可下载"}
                    <van-button
                      type="primary"
                      size="mini"
                      onClick={downloadModel}
                    >
                      {browser.i18n.getMessage("model_download_btn") || "点击下载模型"}
                    </van-button>
                  </div>
                </>
              ) : status.value === "downloading" ? (
                <van-loading size="24px" vertical>
                  {browser.i18n.getMessage("model_downloading") || "模型下载中..."}
                </van-loading>
              ) : status.value === "unavailable" ? (
                <div class="flex items-center gap-1">
                  <CircleX class="w-5 h-5 text-red-500" />
                  {browser.i18n.getMessage("model_unavailable") || "模型在此设备上不可用"}
                </div>
              ) : null}
              {subtitle.value && (
                <div class="mt-2 flex items-center gap-1">
                  <FileText class="w-5 h-5 text-blue-500" />
                  {browser.i18n.getMessage("subtitle_optimized") || "已获取字幕，优化后的字幕共"}{subtitle.value.length}{browser.i18n.getMessage("subtitle_chars") || "个字符"}
                  <span class="cursor-pointer" onClick={openSubtitleDialog}>
                    <Eye class="w-5 h-5 text-gray-500 hover:text-gray-100" />
                  </span>
                </div>
              )}
              {status.value === "available" ? (
                loading.value ? (
                  <van-loading size="24px" vertical>
                    {browser.i18n.getMessage("summary_generating") || "正在生成摘要..."}
                  </van-loading>
                ) : (
                  <>
                    {error.value ? (
                      <div class="my-2 flex items-center text-red-500">
                        {error.value}
                      </div>
                    ) : null}
                    <div
                      class="dark text-white prose prose-truegray text-lg leading-normal"
                      innerHTML={summary.value}
                    ></div>
                    {done.value && (
                      <div class="mb-12 flex justify-between items-center gap-1">
                        <div class="flex items-center gap-1">
                          <Check class="w-5 h-5 text-green-500" />
                          {browser.i18n.getMessage("summary_done") || "完成摘要生成"}
                        </div>
                        <div>
                          <span
                            onClick={() => {
                              Clipboard.copy(summary.value);
                              showNotify({
                                type: "success",
                                message: browser.i18n.getMessage("notify_copied") || "copied successfully",
                                duration: 1000,
                              });
                            }}
                          >
                            <Copy
                              v-tooltip="copy"
                              class="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-100"
                            />
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )
              ) : null}
            </div>

            {/* 底部渐变遮罩 */}
            <div
              class="absolute bottom-0 left-0 right-0 h-6 pointer-events-none z-10"
              style="background: linear-gradient(to top, #282828, transparent);"
            ></div>
          </div>
          <div class="summarize-footer flex flex-col gap-3 mt-4">
            <div class="flex flex-row gap-3">
              <div class="flex-1">
                <label class="block text-sm text-gray-300 mb-1">{browser.i18n.getMessage("summary_type_label") || "摘要类型"}</label>
                <select
                  v-model={summaryType.value}
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  {summaryTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div class="flex-1">
                <label class="block text-sm text-gray-300 mb-1">{browser.i18n.getMessage("summary_length_label") || "摘要长度"}</label>
                <select
                  v-model={summaryLength.value}
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  {lengthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div class="flex-1">
                <label class="block text-sm text-gray-300 mb-1">{browser.i18n.getMessage("input_size_label") || "输入大小"}</label>
                <van-field
                  size="normal"
                  min="50"
                  max="60000"
                  class="w-full leading-tight px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                  v-model={inputSize.value}
                  type="digit"
                />
              </div>
            </div>

            <van-button
              type="primary"
              disabled={
                status.value !== "available" ||
                loading.value ||
                summarizing.value
              }
              onClick={startSummary}
            >
              {loading.value ? (browser.i18n.getMessage("summary_generating") || "正在生成...") : (browser.i18n.getMessage("summary_btn") || "生成摘要")}
            </van-button>
          </div>
        </main>
      </van-config-provider>
    );
  },
});
