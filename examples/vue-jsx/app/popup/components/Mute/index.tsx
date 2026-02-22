/*
 * @description: store Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */
import { defineComponent, inject } from "vue";
import { VolumeHighOutline, VolumeMuteOutline } from "@vicons/ionicons5";
import type { IRollConfig } from "../../../types/type.d";
import "./index.less";
import { Volume, Volume3 } from "@vicons/tabler";

export default defineComponent({
  name: "Mute",
  setup() {
    const batchUpdate = inject("batchUpdate") as Function;
    const rollConfig = inject("rollConfig") as IRollConfig;

    const setMuted = () => {
      rollConfig.muted = !rollConfig.muted;
      batchUpdate({
        volume: rollConfig.muted ? 0 : 1,
        muted: rollConfig.muted,
      });
    };
    return () => (
      <div
        title="Muted"
        class={`video-roll-focus video-roll-item ${
          rollConfig.volume === 0 ? "video-roll-on" : "video-roll-off"
        }`}
        onClick={setMuted}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            {rollConfig.volume === 0 ? (
              <Volume3 class="video-roll-icon"></Volume3>
            ) : (
              <Volume class="video-roll-icon"></Volume>
            )}
          </span>
        </div>
      </div>
    );
  },
});
