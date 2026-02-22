/*
 * @description: Scale Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import { defineComponent, inject, computed, watch } from "vue";
import { CropOutline } from "@vicons/ionicons5";
import type { IRollConfig } from "../../../types/type";
import browser from "webextension-polyfill";
import "./index.less";
import debounce from "lodash-es/debounce";
import { getDefaultConfig } from "app/use";
import { AspectRatio } from "@vicons/tabler";

export default defineComponent({
  name: "Stretch",
  setup() {
    const update = inject("update") as Function;
    const rollConfig = inject("rollConfig") as IRollConfig;
    const setPopupShow = inject("setPopupShow") as Function;
    const updateRenderContent = inject("updateRenderContent") as Function;

    const isDefault = computed(() =>
      rollConfig.scale.values.some((v) => Number(v) !== 1)
    );

    const setScaleX = debounce((value: number) => {
      rollConfig.scale.values[0] = value;
      update("scale", rollConfig.scale);
    }, 100);

    const setScaleY = debounce((value: number) => {
      rollConfig.scale.values[1] = value;
      update("scale", rollConfig.scale);
    }, 100);

    const reset = () => {
      setScaleX(getDefaultConfig().scale.values[0]);
      setScaleY(getDefaultConfig().scale.values[1]);
    };

    const popupRender = () => (
      <>
        <div class="video-roll-scale">
          <div class="video-roll-scale-custom">
            <div class="video-roll-scale-slider">
              <van-divider class="enable-label">
                {browser.i18n.getMessage("video_horizental")}
              </van-divider>
              <van-slider
                v-model={rollConfig.scale.values[0]}
                min={0}
                max={4}
                step="0.01"
                bar-height="4px"
                onUpdate:modelValue={setScaleX}
                v-slots={{
                  button: () => (
                    <div class="custom-button">{rollConfig.scale.values[0]}</div>
                  ),
                }}
              ></van-slider>
            </div>

            <div class="video-roll-scale-slider">
              <van-divider class="enable-label">
                {browser.i18n.getMessage("video_vertical")}
              </van-divider>
              <van-slider
                v-model={rollConfig.scale.values[1]}
                min="0"
                max="4"
                step="0.01"
                bar-height="4px"
                onUpdate:modelValue={setScaleY}
                v-slots={{
                  button: () => (
                    <div class="custom-button">{rollConfig.scale.values[1]}</div>
                  ),
                }}
              ></van-slider>
            </div>
          </div>
        </div>
        <van-button
          class="video-roll-resetBtn"
          size="mini"
          icon="replay"
          type="primary"
          onClick={reset}
        >
          {browser.i18n.getMessage("action_reset")}
        </van-button>
      </>
    );

    const showPopup = () => {
      setPopupShow(true);
      updateRenderContent(popupRender);
    };

    return () => (
      <div
        v-tooltip={browser.i18n.getMessage("video_stretch")}
        class={`video-roll-focus video-roll-item ${
          isDefault.value ? "video-roll-on" : "video-roll-off"
        }`}
        onClick={showPopup}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            {<AspectRatio class="video-roll-icon"></AspectRatio>}
          </span>
        </div>
      </div>
    );
  },
});
