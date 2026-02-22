/*
 * @description: ABloop Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */
import { defineComponent, inject } from "vue";
import "./index.less";
import browser from "webextension-polyfill";
import { IRollConfig } from "app/types/type";
import { vPermission } from "app/lib/directive";
import { Repeat } from "@vicons/tabler";

export default defineComponent({
  name: "ABLoop",
  directives: {
    permission: vPermission,
  },
  setup() {
    const update = inject("update") as Function;
    const rollConfig = inject("rollConfig") as IRollConfig;
    const setPopupShow = inject("setPopupShow") as Function;
    const user = inject("user");
    const updateRenderContent = inject("updateRenderContent") as Function;
    
    const switchAbloop = (value: boolean) => {
      rollConfig.abLoop.on = value;
      update("abLoop", rollConfig.abLoop);
    };

    const updateAbloop = () => {
      if (rollConfig.abLoop.on) {
        update("abLoop", rollConfig.abLoop);
      }
    }

    const popupRender = () => (
      <div class="video-roll-filter">
        <div class="video-roll-filter-custom">
          <van-cell-group>
            <van-field
              input-align="right"
              name="switch"
              label={browser.i18n.getMessage("abloop_enable")}
              v-slots={{
                input: () => (
                  <van-switch
                    size="15px"
                    v-model={rollConfig.abLoop.on}
                    onChange={switchAbloop}
                  />
                ),
              }}
            ></van-field>
            <van-field
              v-model={rollConfig.abLoop.a}
              label={browser.i18n.getMessage("abloop_a")}
              colon
              placeholder="00:00:00"
              onChange={updateAbloop}
            />
            <van-field
              v-model={rollConfig.abLoop.b}
              label={browser.i18n.getMessage("abloop_b")}
              colon
              placeholder="00:00:00"
              onChange={updateAbloop}
            />
          </van-cell-group>
        </div>
      </div>
    );

    const showPopup = () => {
      setPopupShow(true);
      updateRenderContent(popupRender);
    };

    return () => (
      <div
        v-tooltip={browser.i18n.getMessage("tab_abloop")}
        class={`video-roll-focus video-roll-item ${
          rollConfig.abLoop.on ? "video-roll-on" : "video-roll-off"
        }`}
        onClick={showPopup}
        v-permission={[user.value?.role]}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            <Repeat class="video-roll-icon"></Repeat>
          </span>
        </div>
      </div>
    );
  },
});
