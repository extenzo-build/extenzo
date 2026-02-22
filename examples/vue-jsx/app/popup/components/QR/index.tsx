/*
 * @description: move Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import { defineComponent, inject, computed } from "vue";
import { MoveOutline, QrCodeOutline } from "@vicons/ionicons5";
import type { IRollConfig } from "../../../types/type";
import { getDefaultConfig } from "../../../use";
import browser from "webextension-polyfill";
import * as QRCode from "easyqrcodejs";
import "./index.less";
import { Qrcode } from "@vicons/tabler";

export default defineComponent({
  name: "QR",
  setup() {
    const rollConfig = inject("rollConfig") as IRollConfig;
    const setPopupShow = inject("setPopupShow") as Function;
    const updateRenderContent = inject("updateRenderContent") as Function;

    const popupRender = () => (
      <>
        <div id="qr-code"></div>
      </>
    );

    const showPopup = () => {
      setPopupShow(true);
      updateRenderContent(popupRender);
      setTimeout(() => {
        const dom = document.getElementById("qr-code");
        (dom as HTMLElement).innerHTML = "";
        const qrcode = new QRCode(document.getElementById("qr-code"), {
          text: rollConfig.url,
          width: 180,
          height: 180,
        });
      }, 100);
    };

    return () => (
      <div
        v-tooltip={browser.i18n.getMessage("tab_qr")}
        class={`video-roll-focus video-roll-item video-roll-off`}
        onClick={showPopup}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label">
            <Qrcode class="video-roll-icon"></Qrcode>
          </span>
        </div>
      </div>
    );
  },
});
