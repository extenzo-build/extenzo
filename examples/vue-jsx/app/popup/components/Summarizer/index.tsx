/*
 * @description: download Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */
import { defineComponent, inject, onMounted, ref, watch } from "vue";
import { RadioButtonOnOutline } from "@vicons/ionicons5";
import { BrandHipchat, Messages } from "@vicons/tabler";
import browser from "webextension-polyfill";
import { ActionType, IRollConfig } from "app/types/type.d";

export default defineComponent({
  name: "Summarizer",
  setup() {
    const rollConfig = inject("rollConfig") as IRollConfig;
    const openSidePanel = () => {
      chrome.sidePanel.open({ tabId: rollConfig.tabId });
      window.close();
    };
    return () => (
      <div
        v-tooltip={"AI Summarizer(Experimental)"}
        class={`video-roll-focus video-roll-item video-roll-off`}
        onClick={openSidePanel}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label video-roll-flex">
            <Messages class="video-roll-icon"></Messages>
          </span>
        </div>
      </div>
    );
  },
});
