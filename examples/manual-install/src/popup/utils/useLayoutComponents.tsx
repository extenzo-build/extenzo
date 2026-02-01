/**
 * useLayoutComponents - 使用布局配置的组件系统
 */
import { computed, onMounted, ref } from "vue";
import { DeviceTv, Headphones, Download, Adjustments } from "@vicons/tabler";
import { Tooltip } from "floating-vue";
import {
  TabConfig,
  RowConfig,
  ComponentItem,
  LayoutConfig,
  loadLayoutConfigFromStorage,
} from "../../shared/utils/layoutConfigStorage";

import { JSX } from "vue/jsx-runtime";

// 静态导入所有组件
import Rotate from "../components/Rotate";
import Loop from "../components/Loop";
import PictureInPicture from "../components/PictureInPicture";
import Reposition from "../components/Repostion";
import Stretch from "../components/Stretch";
import Flip from "../components/Flip";
import Capture from "../components/Capture";
import QR from "../components/QR";
import Filter from "../components/Filter";
import Focus from "../components/Focus";
import AdvancedPictureInPicture from "../components/AdvancedPictureInPicture";
import ABLoop from "../components/ABLoop";
import VR from "../components/Vr";
import Record from "../components/Record";
import Player from "../components/Player";
import PlaybackRate from "../components/PlaybackRate";
import Zoom from "../components/Zoom";
import Mute from "../components/Mute";
import Panner from "../components/Panner";
import Volume from "../components/Volume";
import Pitch from "../components/Pitch";
import Delay from "../components/Delay";
import Stereo from "../components/Stereo";
import VideoList from "../components/VideoList";
import More from "../components/More";
import Summarizer from "../components/Summarizer";
import Favourites from "../components/Favourites";
import Convert from "../components/Convert";
import { checkPermission } from "src/lib/directive";


interface IConfig {
  type: string;
  title?: JSX.Element | string;
  merge?: boolean;
  style?: Object;
  class?: string;
  children?: any[];
}

interface IComponentConfig extends IConfig {
  type: "component";
  component: any;
}

interface IContainerConfig extends IConfig {
  type: "container";
  title?: string;
  col?: number;
  showTitle?: boolean;
  children?: IComponentConfig[] | IRowConfig[];
}

interface IFragmentConfig extends IConfig {
  type: "fragment";
  col?: number;
  children?: IComponentConfig[] | IRowConfig[];
}

interface IRowConfig extends IConfig {
  type: "row";
  children: IContainerConfig[] | IFragmentConfig[];
}

interface ISwiperConfig extends IConfig {
  type: "swiper";
  children: IRowConfig[];
}

interface ITabConfig extends IConfig {
  type: "tab";
  badgeRender?: () => string | number;
  children: IRowConfig[] | IComponentConfig[];
}

type TabBadgeOption = {
  tabId: string;
  badgeRender?: () => string | number;
};

export default function useLayoutComponents(
  tabBadgeOptions: TabBadgeOption[],
  user: any
) {
  // 使用独立的布局配置状态
  const layoutConfig = ref<LayoutConfig>({
    tabs: [],
    version: "1.0.0",
  });
  const isConfigLoaded = ref(false);

  // 加载配置的独立方法
  const loadConfig = async () => {
    try {
      const config = await loadLayoutConfigFromStorage();
      layoutConfig.value = config;
      isConfigLoaded.value = true;
    } catch (error) {
      console.error(
        "useLayoutComponents: Failed to load configuration:",
        error
      );
      isConfigLoaded.value = true; // 即使失败也要标记为已加载，使用默认配置
    }
  };

  // 组件映射表
  const componentMap: Record<string, any> = {
    rotate: <Rotate />,
    loop: <Loop />,
    pip: <PictureInPicture />,
    reposition: <Reposition />,
    stretch: <Stretch />,
    flip: <Flip />,
    capture: <Capture />,
    qr: <QR />,
    filter: <Filter />,
    focus: <Focus />,
    separate: <AdvancedPictureInPicture />,
    player: <Player />,
    favourites: <Favourites />,
    abloop: <ABLoop />,
    vr: <VR />,
    record: <Record />,
    summarizer: <Summarizer />,
    speed: <PlaybackRate />,
    zoom: <Zoom />,
    // 音频组件
    mute: <Mute />,
    panner: <Panner />,
    volume: <Volume />,
    pitch: <Pitch />,
    delay: <Delay />,
    stereo: <Stereo />,
    convert: <Convert />,
  };
  // 图标映射表
  const iconMap: Record<string, any> = {
    DeviceTv: <DeviceTv class="tab-icon" />,
    Headphones: <Headphones class="tab-icon" />,
    Download: <Download class="tab-icon" />,
    Adjustments: <Adjustments class="tab-icon" />,
  }; // 每次popup打开时加载最新配置
  onMounted(async () => {
    await loadConfig();
  });
  // 根据配置生成组件结构
  const components = computed(() => {
    if (!isConfigLoaded.value || !layoutConfig.value.tabs.length) {
      return [];
    }

    const componentsConfig = layoutConfig.value.tabs
      .filter((tab: TabConfig) => tab.visible)
      .map((tab: TabConfig) => {
        // 为特殊标签页提供自定义内容
        const badgeOption = tabBadgeOptions.find(
          (option) => option.tabId === tab.id
        );
        if (tab.id === "download") {
          return {
            type: "tab",
            title: (
              <Tooltip>
                <div class="tab-title" v-tooltip={tab.name}>
                  {iconMap[tab.icon] || <Download class="tab-icon" />}
                </div>
              </Tooltip>
            ),
            badgeRender: badgeOption ? badgeOption.badgeRender : undefined,
            children: [
              {
                type: "component",
                component: <VideoList />,
              },
            ],
          };
        }

        if (tab.id === "more") {
          return {
            type: "tab",
            title: (
              <Tooltip>
                <div class="tab-title" v-tooltip={tab.name}>
                  {iconMap[tab.icon] || <Adjustments class="tab-icon" />}
                </div>
              </Tooltip>
            ),
            children: [
              {
                type: "row",
                style: {
                  margin: "30px 0",
                  height: "100px",
                },
                children: [
                  {
                    type: "fragment",
                    col: 24,
                    children: [
                      {
                        type: "component",
                        component: <More />,
                      },
                    ],
                  },
                ],
              },
            ],
          };
        }

        // 常规标签页根据配置生成
        return {
          type: "tab",
          title: (
            <Tooltip>
              <div class="tab-title" v-tooltip={tab.name}>
                {iconMap[tab.icon] || <DeviceTv class="tab-icon" />}
              </div>
            </Tooltip>
          ),
          children: tab.rows
            .filter((row: RowConfig) =>
              row.components.some((comp: ComponentItem) => comp.visible)
            )
            .map((row: RowConfig) => ({
              type: "row",
              style: {
                margin: "30px 0",
                height: "40px",
              },
              children: row.components
                .filter((comp: ComponentItem) => comp.visible)
                .map((comp: ComponentItem) => ({
                  type: "container",
                  title: comp.name,
                  showTitle: true,
                  col: comp.colSpan,
                  class: getComponentClass(comp.id),
                  children: [
                    {
                      type: "component",
                      component: componentMap[comp.id] || null,
                    },
                  ],
                })),
            })),
        };
      }) as ITabConfig[];
    return componentsConfig;
  });

  // 获取组件的特殊样式类
  const getComponentClass = (componentId: string): string | undefined => {
    const proComponents = [
      "abloop",
      "vr",
      "record",
      "panner",
      "pitch",
      "delay",
      "stereo",
    ];

    const experimentComponents = ["summarizer"];
    const isAuth = checkPermission([user.value?.role]);
    if (experimentComponents.includes(componentId))
      return "container-badge-experiment";

    if (isAuth) {
      return "";
    }

    if (proComponents.includes(componentId)) {
      return "container-badge-pro";
    }

    return '';
  };

  return components;
}

export {
  ITabConfig,
  ISwiperConfig,
  IRowConfig,
  IComponentConfig,
  IContainerConfig,
  IFragmentConfig,
  IConfig,
};