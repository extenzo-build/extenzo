/*
 * @description: download Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */
import { defineComponent, inject, onMounted, ref, watch } from "vue";
import { RadioButtonOnOutline } from "@vicons/ionicons5";
import { useCountDown } from "@vant/use";
import "./index.less";
import browser from "webextension-polyfill";
import { IRollConfig } from "app/types/type";
import { showLoadingToast, showToast } from "vant";
import { formatTime } from "../../utils/index.js";
import { vPermission } from "app/lib/directive";
import { Capture } from "@vicons/tabler";

export default defineComponent({
  name: "Record",
  directives: {
    permission: vPermission,
  },
  setup() {
    const startRecord = inject("startRecord") as Function;
    const stopRecord = inject("stopRecord") as Function;
    const rollConfig = inject("rollConfig") as IRollConfig;
    const update = inject("update") as Function;
    const realVideo = inject("realVideo") as any;
    const user = inject("user");
    const isRecording = ref(false);
    const recordTime = ref(0);
    const startRecordTime = ref(0);
    const toast = ref();

    const onRecord = () => {
      if (isRecording.value) {
        isRecording.value = false;
        stopRecord();
      } else {
        startRecord();
        isRecording.value = true;
      }
    };

    const refreshStatus = (config: IRollConfig) => {
      switch (config.recordStatus) {
        case "recording":
          isRecording.value = true;
          startRecordTime.value = config.recordTime ?? 0;
          break;
        case "paused":
          isRecording.value = false;
          break;
        case "inactive":
          isRecording.value = false;
          startRecordTime.value = 0;
          recordTime.value = 0;
          break;
        default:
          // isRecording.value = false;
          break;
      }
    };

    watch(
      () => rollConfig,
      () => {
        if (rollConfig.recordInfo) {
          isRecording.value = false;
          toast.value = showToast({
            duration: 2000,
            message: rollConfig.recordInfo,
          });

          update("recordInfo", "");

          return;
        }

        if (rollConfig.recordTime) {
          startRecordTime.value = rollConfig.recordTime ?? 0;
        }

        refreshStatus(rollConfig);
      },
      {
        deep: true,
      }
    );

    watch(
      () => realVideo.value,
      (value) => {
        if (!isRecording.value) return;

        recordTime.value = realVideo.value?.currentTime - startRecordTime.value;
      },
      { deep: true }
    );

    onMounted(() => {
      refreshStatus(rollConfig);
    });

    return () => (
      <div
        v-tooltip={isRecording.value ? browser.i18n.getMessage("stop_record") : browser.i18n.getMessage("tab_record")}
        class={`video-roll-focus video-roll-item video-roll-off ${
          isRecording.value ? "video-roll-recording" : ""
        }`}
        onClick={onRecord}
        v-permission={[user.value?.role]}
      >
        <div class="video-roll-icon-box">
          <span class="video-roll-label video-roll-flex">
            <Capture class="video-roll-icon"></Capture>
            {isRecording.value && recordTime.value > 0 ? (
              <span style="font-size: 10px">
                {formatTime(recordTime.value)}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    );
  },
});
