import { ref } from "vue";
import browser from "webextension-polyfill";

export function useGeneralConfig() {
  return ref([
    {
      type: "group",
      title: browser.i18n.getMessage("video_rotate"),
      key: "rotate",
      config: [
        {
          type: "switch",
          title: browser.i18n.getMessage("more_auto_resize"),
          key: "isAutoChangeSize",
          value: true,
        },
      ],
    },
    {
      type: "group",
      title: browser.i18n.getMessage("video_focus"),
      key: "focus",
      config: [
        {
          type: "color-picker",
          title: browser.i18n.getMessage(
            "options_general_focus_backgroundColor"
          ),
          key: "focus.backgroundColor",
          value: "rgba(0, 0, 0, 0.9)",
        },
        {
          type: "switch",
          title: browser.i18n.getMessage(
            "options_general_focus_backgroundBlur"
          ),
          key: "focus.blur",
          value: false,
        },
        {
          type: "switch",
          title: browser.i18n.getMessage("options_general_focus_rounded"),
          key: "focus.rounded",
          value: false,
        },
      ],
    },
    {
      type: "group",
      title: "YouTube",
      key: "youtube",
      config: [
        {
          type: "switch",
          title: browser.i18n.getMessage("more_auto_skip_youtube_ad"),
          key: "skipAd",
          value: true,
        },
      ],
    },
    {
      type: "group",
      title: browser.i18n.getMessage("tabs_audio"),
      key: "audio",
      config: [
        {
          type: "select",
          title: browser.i18n.getMessage("options_general_audio_capture_type"),
          key: "audioCaptureType",
          value: "stream",
          options: [
            {
              label: browser.i18n.getMessage(
                "options_general_audio_capture_page"
              ),
              value: "stream",
            },
            {
              label: browser.i18n.getMessage(
                "options_general_audio_capture_element"
              ),
              value: "element",
            },
          ],
        },
      ],
    },
    {
      type: "group",
      title: browser.i18n.getMessage("others"),
      key: "others",
      config: [
        {
          type: "switch",
          title: browser.i18n.getMessage("force_lock_video_config"),
          key: "forced",
          value: false,
        },
      ],
    },
  ]);
}
