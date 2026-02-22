/*
 * @description: more Component
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import { defineComponent, inject, onMounted, ref, watch } from "vue";
import type { IRollConfig } from "../../../types/type";
import browser from "webextension-polyfill";
import "./index.less";
import Help from "../../utils/Help.js";
import render from "./render";
import { create } from "domain";
import { createURL } from "app/util/createURL";

export default defineComponent({
  name: "More",
  setup() {
    const loading = ref(false);

    const config = ref([]);
    const showConfig = ref([]);
    const rollConfig = inject("rollConfig") as IRollConfig;
    const update = inject("update") as Function;
  
    onMounted(() => {
      loading.value = true;
      browser.storage.sync.get("generalConfig").then((res) => {
        const data = res?.["generalConfig"];
        
        config.value = data;
        buildMoreConfig();
        loading.value = false;
      });
    });

    const onChange = () => {
      browser.storage.sync.set({
        generalConfig: JSON.parse(JSON.stringify(config.value)),
      });
    };

    const onStoreChange = (value: boolean) => {
      rollConfig.store = value;
      update("store", rollConfig.store);
    };

    const buildMoreConfig = () => {
      if (config.value.length) {
        const res = config.value.filter((v) =>
          ["rotate", "youtube", "others"].includes(v.key)
        );
        res.forEach((v) => showConfig.value.push(...v.config));
        return showConfig.value;
      }
      return [];
    };

    const toOptions = () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        createURL(chrome.runtime.getURL("options/index.html"));
      }
    }

    return () => (
      <div class="more-box">
        <div>
          <div class="theme-color more-title">{browser.i18n.getMessage("site_specific_settings")}</div>
          <div class="more-content">
            <div>{browser.i18n.getMessage("more_save_preferences")}</div>
            <van-switch
              size={16}
              v-model={rollConfig.store}
              onChange={onStoreChange}
            />
          </div>
        </div>
        <div>
          <div class="theme-color more-title">{browser.i18n.getMessage("global_configuration")}</div>
          {render(showConfig.value, onChange)}
        </div>
        <div class="theme-color more-link text-blue" onClick={toOptions}>{browser.i18n.getMessage("more_settings")}</div>
      </div>
    );
  },
});
