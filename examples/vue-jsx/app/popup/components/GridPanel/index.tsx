/*
 * @description: grid Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import { defineComponent, ref, provide, h, VueElement, inject } from "vue";
import useLayoutComponents from "../../utils/useLayoutComponents.js";
import render from "../../utils/render.js";
import "./index.less";

export default defineComponent({
  name: "GridPanel",
  setup() {
    const videoList = inject("videoList") as any[];
    const user = inject("user") as any;
    const components = useLayoutComponents(
      [
        {
          tabId: "download",
          badgeRender: () => {
            return !videoList.value.length
              ? 0
              : videoList.value.length < 50 && videoList.value.length > 0
              ? videoList.value.length
              : "50+";
          },
        },
      ],
      user
    );
    const rollConfig = inject("rollConfig") as any;
    const popupShow = ref<boolean>(false);
    const renderContent = ref();

    const setPopupShow = (value: boolean) => {
      popupShow.value = value;
    };

    const updateRenderContent = (content: VueElement) => {
      renderContent.value = content;
    };

    const onClose = (callback: Function) => {
      if (typeof callback === "function") {
        callback();
      }
    };

    provide("setPopupShow", setPopupShow);
    provide("updateRenderContent", updateRenderContent);
    provide("onPopupClose", onClose);
    return () => (
      <div class="video-roll-setting-panel">
        {components.value.length ? (
          <van-tabs sticky animated offset-top="40">
            {render(components.value)}
          </van-tabs>
        ) : null}

        <van-popup
          v-model:show={popupShow.value}
          onClose={onClose}
          round
          closeable
          lazy-render
          style={{
            width: "250px",
            height: "250px",
            padding: "20px",
            overflow: "hidden",
          }}
        >
          {h(renderContent.value)}
        </van-popup>
      </div>
    );
  },
});
