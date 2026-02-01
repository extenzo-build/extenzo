/*
 * @description: download Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */
import { defineComponent, inject, ref, shallowReactive } from "vue";
import { InfiniteOutline, TabletLandscapeOutline } from "@vicons/ionicons5";
import "./index.less";
import browser from "@extenzo/utils/webextension-polyfill"
import { IRollConfig } from "src/types/type";
import { AppWindow } from "@vicons/tabler";

export default defineComponent({
    name: "AdvancedPictureInPicture",
    setup() {
        const advancedPictureInPicture = inject("advancedPictureInPicture") as Function;
        const rollConfig = inject("rollConfig") as IRollConfig;
        const update = inject("update") as Function;

        const setAdvancedPictureInPicture = async () => {
            rollConfig.focus.on = false;
            update("focus", rollConfig.focus);
            rollConfig.pictureInPicture = false;
            update("pictureInPicture", rollConfig.pictureInPicture);
            rollConfig.advancedPictureInPicture.on = true;
            const res = await browser.windows.getCurrent();
            rollConfig.advancedPictureInPicture.originWindowId = res.id as number;
            rollConfig.advancedPictureInPicture.tabIndex = rollConfig.tabIndex as number;
            update("advancedPictureInPicture", rollConfig.advancedPictureInPicture);
            advancedPictureInPicture()
        };

        return () => (
            <div v-tooltip={browser.i18n.getMessage('video_separate')} class={`video-roll-focus video-roll-item ${rollConfig.advancedPictureInPicture.on ? 'video-roll-on' : 'video-roll-off'}`} onClick={setAdvancedPictureInPicture}>
                <div class="video-roll-icon-box">
                    <span class="video-roll-label">
                        <AppWindow class="video-roll-icon"></AppWindow>
                    </span>
                </div>
            </div>
        );
    },
});
