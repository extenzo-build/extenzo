import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import browser from "webextension-polyfill";
import hotkeys from "hotkeys-js";
import { X } from "@vicons/tabler";
import "./index.less";
import { getkeyCodeMap } from "app/util/getKeycodeMap";
import { useShortcuts } from "app/use/useShortcuts";

export default defineComponent({
  name: "Shortcuts",
  setup(props) {
    const currentId = ref("");
    const shortcuts = ref("");
    const isShowSettingInput = ref(false);
    const shortcutsMap = useShortcuts() as any;

    const updateShowSettingInput = (val: boolean) => {
      isShowSettingInput.value = val;
    };
    const updateCurrentId = (val: string) => {
      currentId.value = val;
      shortcuts.value = shortcutsMap.value[val]?.shortcuts.key;
      updateShowSettingInput(true);
    };

    // 清除快捷键的功能
    const clearShortcut = async (key: string) => {
      // 重置为空
      shortcutsMap.value[key].shortcuts = {
        key: "",
        code: [],
      };

      // 保存到存储
      await browser.storage.sync.set({
        shortcuts: JSON.parse(JSON.stringify(shortcutsMap.value)),
      });
    };

    const loadList = async () => {
      browser.storage.sync.get("shortcuts").then((res) => {
        const map = res?.["shortcuts"] ?? {};
        Object.keys(shortcutsMap.value).forEach((key: string) => {
          if (map[key]) {
            shortcutsMap.value[key].shortcuts = map[key]?.shortcuts;
          }
        });
      });
    };

    onMounted(async () => {
      loadList();

      // 设置 hotkeys 配置
      hotkeys.filter = function (event) {
        return true; // 允许所有事件通过
      };

      const handleHotkey = function (event: any, handler: any) {
        event.preventDefault();

        if (!isShowSettingInput.value) return;

        const keys = handler.keys
          .map((key: any) => getkeyCodeMap()[key])
          .join("+");
        shortcuts.value = keys;

        shortcutsMap.value[currentId.value].shortcuts = {
          key: keys,
          code: handler.keys,
        };
        browser.storage.sync.set({
          shortcuts: JSON.parse(JSON.stringify(shortcutsMap.value)),
        });
      };

      // 绑定快捷键的函数
      const bindHotkeys = () => {
        hotkeys.unbind("*");
        hotkeys("*", handleHotkey);
        console.log("Hotkeys bound");
      };

      bindHotkeys();

      // 添加页面可见性监听
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          // 页面重新获得焦点时，重新绑定快捷键
          console.log("Page became visible, rebinding hotkeys");
          setTimeout(bindHotkeys, 100); // 稍微延迟一下确保页面完全激活
        }
      };

      // 添加窗口焦点监听
      const handleWindowFocus = () => {
        console.log("Window focused, rebinding hotkeys");
        setTimeout(bindHotkeys, 100);
      };

      // 添加鼠标点击监听，确保页面获得焦点时重新绑定
      const handleClick = () => {
        if (!hotkeys.isPressed && isShowSettingInput.value) {
          console.log("Page clicked, ensuring hotkeys are active");
          bindHotkeys();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleWindowFocus);
      document.addEventListener("click", handleClick);

      // 定期检查 hotkeys 是否正常工作（每5秒检查一次）
      const healthCheck = setInterval(() => {
        if (
          isShowSettingInput.value &&
          document.visibilityState === "visible"
        ) {
          // 简单的健康检查：确保快捷键仍然绑定
          if (
            !hotkeys.getScope() ||
            Object.keys(hotkeys.getAllKeyCodes()).length === 0
          ) {
            console.log("Hotkeys health check failed, rebinding...");
            bindHotkeys();
          }
        }
      }, 5000);

      // 存储事件监听器和定时器引用以便清理
      (window as any).__videoroll_visibility_listener = handleVisibilityChange;
      (window as any).__videoroll_focus_listener = handleWindowFocus;
      (window as any).__videoroll_click_listener = handleClick;
      (window as any).__videoroll_health_check = healthCheck;
    });

    onUnmounted(() => {
      hotkeys.unbind("*");

      // 清理事件监听器
      const visibilityListener = (window as any)
        .__videoroll_visibility_listener;
      const focusListener = (window as any).__videoroll_focus_listener;
      const clickListener = (window as any).__videoroll_click_listener;
      const healthCheck = (window as any).__videoroll_health_check;

      if (visibilityListener) {
        document.removeEventListener("visibilitychange", visibilityListener);
        delete (window as any).__videoroll_visibility_listener;
      }

      if (focusListener) {
        window.removeEventListener("focus", focusListener);
        delete (window as any).__videoroll_focus_listener;
      }

      if (clickListener) {
        document.removeEventListener("click", clickListener);
        delete (window as any).__videoroll_click_listener;
      }

      if (healthCheck) {
        clearInterval(healthCheck);
        delete (window as any).__videoroll_health_check;
      }
    });

    return () => (
      <>
        <van-overlay
          show={isShowSettingInput.value}
          onClick={() => updateShowSettingInput(false)}
        >
          <div class="shortcuts-main">
            <div class="tips">{browser.i18n.getMessage("press_keyboard_to_reset")}</div>
            <div class="shortcuts-input" onClick={(e) => e.stopPropagation()}>
              {shortcuts.value}
            </div>
          </div>
        </van-overlay>
        <div class="options-general">
          {" "}
          <van-form submit="onSubmit">
            <van-cell-group inset>
              {Object.keys(shortcutsMap.value).map((key: string) => {
                const hasValue =
                  shortcutsMap.value[key].shortcuts.key &&
                  shortcutsMap.value[key].shortcuts.key.trim() !== "";
                return (
                  <div
                    class={`shortcut-item ${hasValue ? "has-value" : ""}`}
                    key={key}
                  >
                    <van-field
                      class="shortcuts-input-body"
                      v-model={shortcutsMap.value[key].shortcuts.key}
                      label={`${shortcutsMap.value[key].title} : `}
                      readonly
                      placeholder={browser.i18n.getMessage("click_to_update")}
                      label-align="right"
                      onClick={() => updateCurrentId(key)}
                    />
                    <button
                      class="clear-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearShortcut(key);
                      }}
                      title={
                        browser.i18n.getMessage("clear_shortcut") ||
                        "清除快捷键"
                      }
                    >
                      <X class="clear-icon" />
                    </button>
                  </div>
                );
              })}
            </van-cell-group>
          </van-form>
        </div>
      </>
    );
  },
});
