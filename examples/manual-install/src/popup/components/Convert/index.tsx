import { defineComponent, ref } from "vue";
import { FileExport } from "@vicons/tabler";
import browser from "@extenzo/utils/webextension-polyfill";
import "./index.less";

export default defineComponent({
  name: "Convert",
  setup() {
    const openConvertPage = () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("convert/convert.html"),
      });
    };

    return () => (
      <div
        v-tooltip={browser.i18n.getMessage("tab_convert")}
        class={`video-roll-focus video-roll-item video-roll-off`}
        onClick={openConvertPage}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            <FileExport class="video-roll-icon"></FileExport>
          </span>
        </div>
      </div>
    );
  },
});
