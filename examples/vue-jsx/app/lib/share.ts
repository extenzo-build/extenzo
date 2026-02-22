import { createApp } from "vue";
import "@vant/touch-emulator";
import "vant/lib/index.css";
import "./global.css";
import FloatingVue from "floating-vue";
import "floating-vue/dist/style.css";

import { vPermission } from "./directive";

import Vant from 'vant';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import Tooltip from 'primevue/tooltip';

export function createVideoRollApp(app: any, selector: string) {
  const vueApp = createApp(app);
  
  // 配置 Vue 识别 Web Components（如 vidstack 的 media-player）
  vueApp.config.compilerOptions.isCustomElement = (tag: string) => {
    return tag.startsWith('media-');
  };
  
  return vueApp
    .use(Vant)
    .use(PrimeVue, {
      theme: {
        preset: Aura,
      },
    })
    .directive('tooltip', Tooltip)
    .use(FloatingVue)
    .directive("permission", vPermission)
    .mount(selector);
}
