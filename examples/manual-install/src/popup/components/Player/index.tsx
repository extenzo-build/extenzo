/*
 * @description: download Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */
import { defineComponent, inject, ref, shallowReactive } from "vue";
import "./index.less";
import browser from "@extenzo/utils/webextension-polyfill";
import { createURL } from "src/util";
import { PlayerPlay } from "@vicons/tabler";

export default defineComponent({
  name: "Player",
  setup() {
    const openPlayer = () => {
      createURL(browser.runtime.getURL("player/player.html"));
    };

    return () => (
      <div
        v-tooltip={browser.i18n.getMessage("tab_player")}
        class={`video-roll-focus video-roll-item video-roll-off`}
        onClick={openPlayer}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            <PlayerPlay class="video-roll-icon"></PlayerPlay>
          </span>
        </div>
      </div>
    );
  },
});
