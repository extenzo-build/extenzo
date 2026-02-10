/*
 * @Author: gomi gxy880520@qq.com
 * @Date: 2025-06-17 19:26:09
 * @LastEditors: gomi gxy880520@qq.com
 * @LastEditTime: 2025-06-27 22:44:14
 * @FilePath: \website-nextc:\programs\VideoRoll-Pro\src\popup\content\components\Vr\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineComponent, inject } from "vue";
import { GlassesOutline } from "@vicons/ionicons5";
import type { IRollConfig } from "../../../types/type.d";
import browser from "webextension-polyfill";
import { vPermission } from "../../../lib/directive";
import "./index.less";
import { Eyeglass } from "@vicons/tabler";

export default defineComponent({
  name: "Vr",
  directives: {
    permission: vPermission
  },
  setup() {
    const update = inject("update") as Function;
    const rollConfig = inject("rollConfig") as IRollConfig;
    const user = inject("user");

    const setVr = () => {
      rollConfig.vr.on = !rollConfig.vr.on;
      update("vr", rollConfig.vr);
    };
    return () => (
      <div
        v-tooltip={browser.i18n.getMessage("tab_vr")}
        class={`video-roll-focus video-roll-item ${
          rollConfig.vr.on ? "video-roll-on" : "video-roll-off"
        }`}
        v-permission={[user.value?.role]}
        onClick={setVr}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            <Eyeglass class="video-roll-icon"></Eyeglass>
          </span>
        </div>
      </div>
    );
  },
});
