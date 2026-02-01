/*
 * @description: pitch Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import { defineComponent, inject, watch } from "vue";
import type { IRollConfig } from "../../../types/type";
import "./index.less";
import debounce from "lodash-es/debounce";
import { vPermission } from "src/lib/directive";

export default defineComponent({
  name: "Pitch",
  directives: {
    permission: vPermission,
  },
  setup() {
    const update = inject("update") as Function;
    const rollConfig = inject("rollConfig") as IRollConfig;
    const user = inject("user");

    const setPitch = debounce((value: number) => {
      rollConfig.pitch.value = value;
      update("pitch", rollConfig.pitch);
    }, 100);

    const setPitchOn = () => {
      if (!rollConfig.pitch.on) rollConfig.pitch.value = 0;
      update("pitch", rollConfig.pitch);
    };

    return () => (
      <div class="video-roll-long-box" v-permission={[user.value?.role]}>
        <van-switch
          v-model={rollConfig.pitch.on}
          size="15px"
          onChange={setPitchOn}
        ></van-switch>
        <div class="video-roll-pitch">
          <van-slider
            class="video-roll-nobackground-slider"
            v-model={rollConfig.pitch.value}
            min={-2}
            max={2}
            step={0.1}
            bar-height="4px"
            disabled={!rollConfig.pitch.on}
            onUpdate:modelValue={setPitch}
            v-slots={{
              button: () => (
                <div class="custom-button">{rollConfig.pitch.value}</div>
              ),
            }}
          ></van-slider>
        </div>
      </div>
    );
  },
});
