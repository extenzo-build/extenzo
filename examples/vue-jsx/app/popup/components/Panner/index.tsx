/*
 * @description: store Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */
import { defineComponent, inject } from "vue";
import { Ear } from "@vicons/tabler";
import type { IRollConfig } from "../../../types/type";
import "./index.less";
import { vPermission } from "app/lib/directive";

export default defineComponent({
  name: "Panner",
  directives: {
    permission: vPermission,
  },
  setup() {
    const update = inject("update") as Function;
    const rollConfig = inject("rollConfig") as IRollConfig;
    const user = inject("user");

    const setPanner = () => {
      rollConfig.panner = !rollConfig.panner;
      update("panner", rollConfig.panner);
    };
    return () => (
      <div
        title="Surround Sound"
        class={`video-roll-focus video-roll-item ${
          rollConfig.panner ? "video-roll-on" : "video-roll-off"
        }`}
        onClick={setPanner}
        v-permission={[user.value?.role]}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            <Ear class="video-roll-icon"></Ear>
          </span>
        </div>
      </div>
    );
  },
});
