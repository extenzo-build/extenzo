import { defineComponent, ref, onMounted } from "vue";
import { useLayoutConfig } from "../../utils/useLayoutConfig";
import {
  Settings,
  Plus,
  Trash,
  Eye,
  EyeOff,
  GripVertical,
  Refresh,
  FileCheck,
  Download,
} from "@vicons/tabler";
import browser from "webextension-polyfill";
import "./index.less";

export default defineComponent({
  name: "LayoutConfig",
  setup() {
    const {
      layoutConfig,
      isConfigMode,
      hasUnsavedChanges,
      loadConfig,
      saveConfig,
      resetToDefault,
      toggleComponentVisibility,
      moveComponent,
      setRowMaxColumns,
      setComponentColSpan,
      addRow,
      removeRow,
      toggleTabVisibility,
      checkForChanges,
    } = useLayoutConfig();

    const activeTab = ref("video");
    const draggedComponent = ref<{
      componentId: string;
      fromTabId: string;
      fromRowId: string;
    } | null>(null);
    const saveMessage = ref("");
    const showSaveMessage = ref(false);
    onMounted(async () => {
      console.log("LayoutConfig component mounted, loading configuration...");
      await loadConfig();
      console.log("LayoutConfig component configuration loaded");

      // 添加键盘快捷键支持 (Ctrl+S 保存)
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === "s") {
          e.preventDefault();
          if (hasUnsavedChanges.value) {
            handleSave();
          }
        }
      };

      // 页面离开前确认
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges.value) {
          e.preventDefault();
          e.returnValue =
            browser.i18n.getMessage("layout_unsaved_warning") ||
            "您有未保存的更改，确定要离开吗？";
          return e.returnValue;
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("beforeunload", handleBeforeUnload);

      // 清理事件监听器
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    });

    const handleSave = async () => {
      const success = await saveConfig();
      if (success) {
        saveMessage.value =
          browser.i18n.getMessage("layout_config_saved") || "配置已保存";
        showSaveMessage.value = true;
        setTimeout(() => {
          showSaveMessage.value = false;
        }, 2000);
      }
    };

    const handleReset = async () => {
      if (
        confirm(
          browser.i18n.getMessage("layout_config_reset_confirm") ||
            "确定要重置为默认布局吗？"
        )
      ) {
        resetToDefault();
        await saveConfig();
        saveMessage.value =
          browser.i18n.getMessage("layout_config_reset") || "已重置为默认布局";
        showSaveMessage.value = true;
        setTimeout(() => {
          showSaveMessage.value = false;
        }, 2000);
      }
    };

    const handleDragStart = (
      componentId: string,
      tabId: string,
      rowId: string,
      event: DragEvent
    ) => {
      draggedComponent.value = {
        componentId,
        fromTabId: tabId,
        fromRowId: rowId,
      };
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    };

    const handleDrop = (
      toTabId: string,
      toRowId: string,
      index: number,
      event: DragEvent
    ) => {
      event.preventDefault();
      if (!draggedComponent.value) return;

      const { componentId, fromTabId, fromRowId } = draggedComponent.value;
      moveComponent(fromTabId, fromRowId, toTabId, toRowId, componentId, index);
      draggedComponent.value = null;
    };

    return () => (
      <div class="layout-config">
        {/* 配置头部 */}
        <div class="config-header">
          {" "}
          <div>
            <h2 style="margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
              {browser.i18n.getMessage("layout_config_title") || "界面布局配置"}
              {hasUnsavedChanges.value && (
                <span
                  style={{
                    background: "#ff6b35",
                    color: "var(--van-gray-1)",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    fontSize: "10px",
                    fontWeight: "normal",
                  }}
                >
                  {browser.i18n.getMessage("layout_unsaved_changes") ||
                    "未保存"}
                </span>
              )}
            </h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--van-gray-6);">
              {browser.i18n.getMessage("layout_config_desc") ||
                "自定义弹窗界面的组件布局和显示"}
              {hasUnsavedChanges.value && (
                <span style="color: #ff6b35; marginLeft: 8px;">
                  {browser.i18n.getMessage("layout_save_reminder") ||
                    "· 请记得保存更改"}
                </span>
              )}
            </p>
          </div>
          <div class="config-actions">
            <button onClick={handleReset} class="flex items-center justify-center gap-1">
              <Refresh class="icon" style="width: 12px; height: 12px;" />
              {browser.i18n.getMessage("layout_reset") || "重置"}
            </button>{" "}
            <button
              onClick={handleSave}
              style={{
                background: hasUnsavedChanges.value
                  ? "#ff6b35"
                  : "var(--van-primary-color)",
                color: "var(--van-gray-1)",
                border: "none",
                position: "relative",
              }}
              class="flex items-center justify-center gap-1"
            >
              <FileCheck class="icon" style="width: 12px; height: 12px;" />
              {browser.i18n.getMessage("layout_save") || "保存"}
              {hasUnsavedChanges.value && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    width: "8px",
                    height: "8px",
                    background: "#ff4757",
                    borderRadius: "50%",
                    fontSize: "10px",
                  }}
                />
              )}
            </button>
            {showSaveMessage.value && (
              <span
                class={`success-message ${showSaveMessage.value ? "show" : ""}`}
              >
                {saveMessage.value}
              </span>
            )}
          </div>
        </div>

        {/* 标签页配置 */}
        <div class="tab-config">
          <div class="tab-config-header">
            <h3>
              {browser.i18n.getMessage("layout_tabs_config") || "标签页配置"}
            </h3>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px;">
            {layoutConfig.tabs.map((tab) => (
              <div
                key={tab.id}
                class="tab-config-item"
                style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--van-sidebar-selected-background); border-radius: 6px;"
              >
                <span style="font-size: 14px;">
                  {tab.name}
                </span>
                <van-switch
                  size="15px"
                  v-model={tab.visible}
                  onChange={() => checkForChanges()}
                />
                {/* <div
                  class={`toggle-switch ${tab.visible ? "active" : ""}`}
                  onClick={() => toggleTabVisibility(tab.id)}
                /> */}
              </div>
            ))}
          </div>
        </div>

        {/* 标签页选择 */}
        <div class="tab-selector">
          <van-tabs v-model:active={activeTab.value} class="" lazy-render>
            {layoutConfig.tabs
              .filter((tab) => ["video", "audio"].includes(tab.id))
              .map((tab) => (
                <van-tab
                  key={tab.id}
                  name={tab.id}
                  v-slots={{ title: () => tab.name }}
                >
                  {/* 组件布局配置 */}
                  <div class="rows-config">
                    {layoutConfig.tabs
                      .find((item) => item.id === tab.id)
                      ?.rows.map((row, rowIndex) => (
                        <div key={row.id} class="row-config">
                          <div class="row-header">
                            <span>
                              {`${browser.i18n
                                .getMessage("layout_row_title")
                                .replace("{0}", (rowIndex + 1).toString())}`}
                            </span>
                            <div class="row-controls">
                              <label>
                                {browser.i18n.getMessage(
                                  "layout_max_columns"
                                ) || "每行显示"}
                                :
                                <select
                                  value={row.maxColumns}
                                  onChange={(e) =>
                                    setRowMaxColumns(
                                      tab.id,
                                      row.id,
                                      parseInt(
                                        (e.target as HTMLSelectElement).value
                                      )
                                    )
                                  }
                                >
                                  {[1, 2, 3, 4].map((num) => (
                                    <option key={num} value={num}>
                                      {num}
                                      {browser.i18n.getMessage(
                                        "layout_items"
                                      ) || "个"}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                onClick={() => addRow(tab.id, row.id)}
                                title={
                                  browser.i18n.getMessage("layout_add_row") ||
                                  "添加行"
                                }
                              >
                                <Plus class="icon" />
                              </button>
                              <button
                                onClick={() =>
                                  removeRow(tab.id, row.id)
                                }
                                title={
                                  browser.i18n.getMessage(
                                    "layout_remove_row"
                                  ) || "删除行"
                                }
                              >
                                <Trash class="icon" />
                              </button>
                            </div>
                          </div>

                          <div
                            class="components-grid"
                            onDragover={handleDragOver}
                            onDrop={(e) =>
                              handleDrop(
                                tab.id,
                                row.id,
                                row.components.length,
                                e
                              )
                            }
                          >
                            {row.components.map((component, index) => (
                              <div
                                key={component.id}
                                class={`component-item`}
                                draggable
                                onDragstart={(e) =>
                                  handleDragStart(
                                    component.id,
                                    tab.id,
                                    row.id,
                                    e
                                  )
                                }
                                onDrop={(e) =>
                                  handleDrop(tab.id, row.id, index, e)
                                }
                              >
                                <div class="component-header">
                                  <GripVertical class="drag-handle" />
                                  <span
                                    class={
                                      !component.visible ? "hidden-text" : ""
                                    }
                                  >
                                    {component.name}
                                  </span>
                                  <button
                                    onClick={() =>
                                      toggleComponentVisibility(
                                        activeTab.value,
                                        component.id
                                      )
                                    }
                                    title={
                                      component.visible
                                        ? browser.i18n.getMessage(
                                            "layout_hide_component"
                                          ) || "隐藏组件"
                                        : browser.i18n.getMessage(
                                            "layout_show_component"
                                          ) || "显示组件"
                                    }
                                  >
                                    {component.visible ? (
                                      <Eye class="icon" />
                                    ) : (
                                      <EyeOff class="icon" />
                                    )}
                                  </button>
                                </div>

                                <div class="component-controls">
                                  <label>
                                    {browser.i18n.getMessage("layout_width") ||
                                      "宽度"}
                                    :
                                    <select
                                      value={component.colSpan}
                                      onChange={(e) =>
                                        setComponentColSpan(
                                          activeTab.value,
                                          component.id,
                                          parseInt(
                                            (e.target as HTMLSelectElement)
                                              .value
                                          )
                                        )
                                      }
                                    >
                                      <option value={6}>1/4</option>
                                      <option value={8}>1/3</option>
                                      <option value={12}>1/2</option>
                                      <option value={24}>
                                        {browser.i18n.getMessage(
                                          "layout_full_width"
                                        ) || "full width"}
                                      </option>
                                    </select>
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                    <button
                      class="add-row-btn"
                      onClick={() => addRow(activeTab.value)}
                    >
                      <Plus class="icon" />
                      {browser.i18n.getMessage("layout_add_new_row") ||
                        "添加新行"}
                    </button>
                  </div>
                </van-tab>
              ))}
          </van-tabs>
        </div>
      </div>
    );
  },
});
