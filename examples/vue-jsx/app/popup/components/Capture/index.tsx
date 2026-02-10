/*
 * @description: capture Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import { defineComponent, inject } from "vue";
import browser from "webextension-polyfill";
import "./index.less";
import { Photo } from "@vicons/tabler";

export default defineComponent({
  name: "Capture",
  setup() {
    const onCapture = inject("capture") as Function;

    const capture = () => {
      onCapture();
    };

    return () => (
      <div
        v-tooltip={browser.i18n.getMessage("video_screenshot")}
        class={`video-roll-store video-roll-item video-roll-off`}
        onClick={capture}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            {<Photo class="video-roll-icon"></Photo>}
          </span>
        </div>
      </div>
    );
  },
});
