/*
 * @description: favourites Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */
import { defineComponent } from "vue";
import "./index.less";
import browser from "@extenzo/utils/webextension-polyfill";
import { createURL } from "src/util";
import { Bookmark } from "@vicons/tabler";

export default defineComponent({
  name: "Favourites",
  setup() {
    const openFavourites = () => {
      createURL(browser.runtime.getURL("favourites/favourites.html"));
    };

    return () => (
      <div
        v-tooltip={browser.i18n.getMessage("tab_favourites")}
        class={`video-roll-focus video-roll-item video-roll-off`}
        onClick={openFavourites}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            <Bookmark class="video-roll-icon"></Bookmark>
          </span>
        </div>
      </div>
    );
  },
});
