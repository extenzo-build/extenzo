import { defineComponent, ref, h, onMounted } from "vue";
import Header from "./components/Header";
import Navbar from "./components/Navbar";

import "./index.less";
import { OPTIONS_MENU } from "./config";
import Panel from "./components/Panel";

export default defineComponent({
  name: "App",
  setup() {
    const active = ref(0);
    const onChange = (item: any, index: number) => {
      active.value = index;
    };
    const currentTheme = ref("dark");

    const getTheme = () => {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "dark";
      }
      return "light";
    };

    onMounted(() => {
      chrome.storage.local.get("videoroll-theme").then((theme) => {
        currentTheme.value = theme["videoroll-theme"] ?? getTheme();
      });
    });
    return () => (
      <van-config-provider theme={currentTheme.value}>
        <Header></Header>
        <main class="mx-auto">
          <Navbar active={active.value} onChange={onChange}></Navbar>
          <Panel
            v-slots={{
              content: () => h(OPTIONS_MENU[active.value].component),
            }}
          ></Panel>
        </main>
      </van-config-provider>
    );
  },
});
