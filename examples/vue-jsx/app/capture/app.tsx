import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import { IconDownload } from "@tabler/icons-vue";

import "./index.less";
import { saveAs } from "file-saver";

export default defineComponent({
  name: "App",
  setup() {
    const imgSrc = ref("");
    const captureId = ref("");
    const format = ref<"jpg" | "png" | "webp">("png");
    const downloading = ref(false);

    const currentTheme = ref("dark");

    const getTheme = () => {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "dark";
      }
      return "light";
    };

    onMounted(async () => {
      chrome.storage.session.get("videoroll-theme").then((theme) => {
        currentTheme.value = theme["videoroll-theme"] ?? getTheme();
      });
      const params = new URLSearchParams(window.location.search);
      captureId.value = params.get("captureId") as string;

      if (captureId.value) {
        chrome.storage.session
          .get([captureId.value])
          .then((res) => {
            const { imgData } = res[captureId.value] || {};
            if (imgData) {
              imgSrc.value = imgData;
            }
          })
          .then(() => {});
      }
    });

    onUnmounted(() => {
      chrome.storage.session.remove([captureId.value]);
    });

    const downloadImage = async () => {
      if (!imgSrc.value || downloading.value) return;
      downloading.value = true;
      try {
        const img = new Image();
        // In case of remote sources, avoid canvas tainting. For data URLs it's harmless.
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => reject(e);
          img.src = imgSrc.value;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        const ext = format.value;
        const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        const quality = 0.92; // sensible default for lossy formats

        await new Promise<void>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (!blob)
                return reject(new Error("Failed to create image blob"));
              const ts = new Date();
              const pad = (n: number) => String(n).padStart(2, "0");
              const filename = `videoroll_capture_${ts.getFullYear()}${pad(
                ts.getMonth() + 1
              )}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(
                ts.getMinutes()
              )}.${ext}`;
              saveAs(blob, filename);
              resolve();
            },
            mime,
            mime === "image/png" ? undefined : quality
          );
        });
      } catch (err) {
        // swallow error; could add a Toast in future
        console.error("Download failed:", err);
      } finally {
        downloading.value = false;
      }
    };

    return () => (
      <van-config-provider theme={currentTheme.value}>
        {/* <Header></Header> */}
        <main class="pb-20 pt-2 overflow-auto flex flex-col">
          <div class="flex items-center justify-center">
            <img class="w-1/2" src={imgSrc.value}></img>
          </div>
          <div class="flex flex-col items-center justify-center gap-3 mt-4 px-3">
            <label class="flex items-center gap-2">
              <select
                class={
                  [
                    "border rounded px-2 py-1 outline-none",
                    currentTheme.value === "dark"
                      ? "bg-[#1f1f1f] text-white border-[#1989fa]"
                      : "bg-white text-[#111] border-[#1989fa]",
                    "focus:(ring-2 ring-[#1989fa])",
                  ] as any
                }
                value={format.value}
                onChange={(e: Event) => {
                  const target = e.target as HTMLSelectElement;
                  const v = target.value as "jpg" | "png" | "webp";
                  format.value = v;
                }}
              >
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
              </select>
            </label>
            <van-button
              type="primary"
              size="small"
              class="w-[100px]"
              loading={downloading.value}
              disabled={!imgSrc.value}
              onClick={downloadImage}
              title={chrome.i18n.getMessage("video_download") || "Download"}
              aria-label={
                chrome.i18n.getMessage("video_download") || "Download"
              }
            >
              <IconDownload size={6} />
            </van-button>
          </div>
        </main>
      </van-config-provider>
    );
  },
});
