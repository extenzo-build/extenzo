import { ref, reactive } from 'vue';
import browser from "@extenzo/utils/webextension-polyfill";
import {
  ComponentItem,
  RowConfig,
  TabConfig,
  LayoutConfig,
  getDefaultComponents,
  generateDefaultRows,
  loadLayoutConfigFromStorage,
  saveLayoutConfigToStorage
} from '../../shared/utils/layoutConfigStorage';

// 导出类型以供其他模块使用
export type { ComponentItem, RowConfig, TabConfig, LayoutConfig };

export function useLayoutConfig() {
  const layoutConfig = reactive<LayoutConfig>({
    tabs: [],
    version: '1.0.0'
  });

  const isConfigMode = ref(false);
  const hasUnsavedChanges = ref(false);

  // 检查是否有未保存的更改
  const checkForChanges = () => {
    hasUnsavedChanges.value = true;
  };

  // 加载配置
  const loadConfig = async () => {
    try {
      const config = await loadLayoutConfigFromStorage();

      // 清空现有配置
      layoutConfig.tabs.splice(0);
      layoutConfig.version = config.version;
      
      // 深拷贝配置数据以避免引用问题
      layoutConfig.tabs.push(...JSON.parse(JSON.stringify(config.tabs)));
      
      // 加载完成后重置变更标记
      hasUnsavedChanges.value = false;
    } catch (error) {
      console.error('useLayoutConfig: Failed to load layout config:', error);
      resetToDefault();
      hasUnsavedChanges.value = false;
    }
  };

  // 保存配置
  const saveConfig = async () => {
    try {
      const success = await saveLayoutConfigToStorage({
        tabs: layoutConfig.tabs,
        version: layoutConfig.version
      });
      
      if (success) {
        // 保存成功后重置变更标记
        hasUnsavedChanges.value = false;
      }
      
      return success;
    } catch (error) {
      console.error('useLayoutConfig: Failed to save layout config:', error);
      return false;
    }
  };

  // 重置为默认配置
  const resetToDefault = () => {
    const defaultComponents = getDefaultComponents();
    
    // 清空现有配置并重新添加
    layoutConfig.tabs.splice(0);
    layoutConfig.tabs.push(
      {
        id: 'video',
        name: browser.i18n.getMessage('tabs_video'),
        nameKey: 'tabs_video',
        icon: 'DeviceTv',
        visible: true,
        rows: generateDefaultRows(defaultComponents.filter(c => c.category === 'video'))
      },
      {
        id: 'audio',
        name: browser.i18n.getMessage('tabs_audio'),
        nameKey: 'tabs_audio',
        icon: 'Headphones',
        visible: true,
        rows: generateDefaultRows(defaultComponents.filter(c => c.category === 'audio'))
      },
      {
        id: 'download',
        name: browser.i18n.getMessage('tab_download'),
        nameKey: 'tab_download',
        icon: 'Download',
        visible: true,
        rows: []
      },
      // {
      //   id: 'analysis',
      //   name: browser.i18n.getMessage('tab_download'),
      //   nameKey: 'tab_download ',
      //   icon: 'Download',
      //   visible: true,
      //   rows: []
      // },
      {
        id: 'more',
        name: browser.i18n.getMessage('tabs_more'),
        nameKey: 'tabs_more',
        icon: 'Adjustments',
        visible: true,
        rows: []
      }
    );
  };

  // 切换组件可见性
  const toggleComponentVisibility = (tabId: string, componentId: string) => {
    const tab = layoutConfig.tabs.find((t: TabConfig) => t.id === tabId);
    if (!tab) return;

    tab.rows.forEach((row: RowConfig) => {
      const component = row.components.find((c: ComponentItem) => c.id === componentId);
      if (component) {
        component.visible = !component.visible;
      }
    });
    checkForChanges();
  };

  // 调整组件在行中的位置
  const moveComponent = (fromTabId: string, fromRowId: string, toTabId: string, toRowId: string, componentId: string, newIndex: number) => {
    const fromTab = layoutConfig.tabs.find((t: TabConfig) => t.id === fromTabId);
    const toTab = layoutConfig.tabs.find((t: TabConfig) => t.id === toTabId);
    if (!fromTab || !toTab) return;

    const fromRow = fromTab.rows.find((r: RowConfig) => r.id === fromRowId);
    const toRow = toTab.rows.find((r: RowConfig) => r.id === toRowId);
    if (!fromRow || !toRow) return;

    const componentIndex = fromRow.components.findIndex((c: ComponentItem) => c.id === componentId);
    if (componentIndex === -1) return;

    const [component] = fromRow.components.splice(componentIndex, 1);
    toRow.components.splice(newIndex, 0, component);
    checkForChanges();
  };

  // 调整行的最大列数
  const setRowMaxColumns = (tabId: string, rowId: string, maxColumns: number) => {
    const tab = layoutConfig.tabs.find((t: TabConfig) => t.id === tabId);
    if (!tab) return;

    const row = tab.rows.find((r: RowConfig) => r.id === rowId);
    if (!row) return;

    row.maxColumns = Math.max(1, Math.min(4, maxColumns));
    checkForChanges();
  };

  // 调整组件的列宽
  const setComponentColSpan = (tabId: string, componentId: string, colSpan: number) => {
    const tab = layoutConfig.tabs.find((t: TabConfig) => t.id === tabId);
    if (!tab) return;

    tab.rows.forEach((row: RowConfig) => {
      const component = row.components.find((c: ComponentItem) => c.id === componentId);
      if (component) {
        component.colSpan = colSpan;
      }
    });
    checkForChanges();
  };

  // 添加新行
  const addRow = (tabId: string, afterRowId?: string) => {
    const tab = layoutConfig.tabs.find((t: TabConfig) => t.id === tabId);
    if (!tab) return;

    const newRow: RowConfig = {
      id: `row_${Date.now()}_${Math.random()}`,
      components: [],
      maxColumns: 2
    };

    if (afterRowId) {
      const index = tab.rows.findIndex((r: RowConfig) => r.id === afterRowId);
      tab.rows.splice(index + 1, 0, newRow);
    } else {
      tab.rows.push(newRow);
    }
    checkForChanges();
  };

  // 删除行
  const removeRow = (tabId: string, rowId: string) => {
    const tab = layoutConfig.tabs.find((t: TabConfig) => t.id === tabId);
    if (!tab) return;

    const rowIndex = tab.rows.findIndex((r: RowConfig) => r.id === rowId);
    if (rowIndex !== -1) {
      const removedRow = tab.rows[rowIndex];
      if (removedRow.components.length > 0) {
        const targetRow = tab.rows[rowIndex - 1] || tab.rows[rowIndex + 1];
        if (targetRow) {
          targetRow.components.push(...removedRow.components);
        }
      }
      
      tab.rows.splice(rowIndex, 1);
    }
    checkForChanges();
  };

  // 切换标签页可见性
  const toggleTabVisibility = (tabId: string) => {
    const tab = layoutConfig.tabs.find((t: TabConfig) => t.id === tabId);
    if (tab) {
      tab.visible = !tab.visible;
    }
    checkForChanges();
  };

  return {
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
    checkForChanges
  };
}