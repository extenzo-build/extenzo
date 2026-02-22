/*
 * @description: speed Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import {
  defineComponent,
  inject,
  onMounted,
  ref,
  shallowRef,
  nextTick,
} from "vue";
import type { IRollConfig } from "../../../types/type.d";
import "./index.less";
import { Dropdown } from "floating-vue";
import { DotsVertical } from "@vicons/tabler";

export default defineComponent({
  name: "PlaybackRate",
  setup() {
    const update = inject("update") as Function;
    const rollConfig = inject("rollConfig") as IRollConfig;

    const selections = shallowRef([
      {
        title: "0.25x",
        value: 0.25,
      },
      {
        title: "0.5x",
        value: 0.5,
      },
      {
        title: "1.0x",
        value: 1,
      },
      {
        title: "1.5x",
        value: 1.5,
      },
      {
        title: "2.0x",
        value: 2,
      },
      {
        title: "16.0x",
        value: 16,
      },
    ]);

    const setPlaybackRateNum = (item: any) => {
      rollConfig.playbackRate = Number(item.value);
      update("playbackRate", Number(item.value));
    };

    // 处理 popper 显示事件，自动聚焦输入框
    const handlePopperShow = async () => {
      setTimeout(() => {
        // 查找 van-stepper 内的 input 元素并聚焦
        const stepperInput = document.querySelector('.v-popper__inner .van-stepper input');
        if (stepperInput) {
          stepperInput.focus();
        }
      }, 200);
    };

    return () => (
      <div class="video-roll-long-box">
        {selections.value.map((item) => (
          <div
            class={`speed-item ${
              Number(rollConfig.playbackRate) === Number(item.value)
                ? "video-roll-switch-on video-roll-on"
                : ""
            }`}
            onClick={() => setPlaybackRateNum(item)}
          >
            {item.title}
          </div>
        ))}
        <Dropdown
          distance="6"
          placement="top"
          onShow={handlePopperShow}
          v-slots={{
            popper: () => (
              <van-stepper
                v-model={rollConfig.playbackRate}
                min={0.01}
                max={16}
                step={0.01}
                // decimal-length="1"
                input-width="40px"
                button-size="32px"
                onUpdate:modelValue={(val: number) =>
                  setPlaybackRateNum({ value: val })
                }
              ></van-stepper>
            ),
          }}
        >
          <span class="video-roll-label">
            <DotsVertical class="video-roll-icon"></DotsVertical>
          </span>
        </Dropdown>
      </div>
    );
  },
});
