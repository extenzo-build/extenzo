/*
 * @description: useConfig
 * @Author: Gouxinyu
 * @Date: 2022-09-11 10:01:32
 */
import { reactive } from "vue";
import { IRollConfig } from '../types/type';

const defaultFilterConfig = {
    mode: 'unset',
    blur: 0,
    brightness: 1,
    contrast: 100,
    grayscale: 0,
    'hue-rotate': 0,
    invert: 0
}

const defaultConfig = {
    tabId: 0,
    tabIndex: -1,
    videoNumber: 1,
    url: '',
    name: '',
    flip: 'unset',
    pictureInPicture: false,
    advancedPictureInPicture: {
        on: false,
        originWindowId: 0,
        width: 366,
        height: 206,
        left: 800,
        top: 800,
        tabIndex: -1
    },
    scale: {
        mode: 'custom',
        values: [1, 1],
    },
    move: {
        x: 0,
        y: 0
    },
    playbackRate: 1,
    focus: {
        on: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        blur: false,
        rounded: false
    },
    delay: 0,
    pitch: {
        on: false,
        value: 0
    },
    stereo: 0,
    volume: 1,
    filter: {
        ...defaultFilterConfig
    },
    zoom: 1,
    deg: 0,
    storeThisTab: true,
    store: false,
    isInit: false,
    isAutoChangeSize: true,
    loop: false,
    muted: false,
    panner: false,
    enable: true,
    iframes: [],
    document: {
        title: ''
    },
    summarizer: false,
    favIcon: '',
    vr: {
        on: false
    },
    videoRecord: {},
    audioRecord: {},
    abLoop: {
        on: false,
        a: "00:00:00",
        b: "00:00:00"
    },
    crossorigin: false,
    videoSelector: { defaultDom: 'video' },
    recordStatus: undefined,
    recordInfo: '',
    subtitle: {
        on: false
    },
    skipAd: true,
    audioCaptureType: 'stream',
    forced: false
} as IRollConfig;

function getDefaultConfig() {
    return JSON.parse(JSON.stringify(defaultConfig));
}

function useConfig(): IRollConfig {
    const rollConfig = reactive<IRollConfig>(getDefaultConfig());
    return rollConfig;
}

export { useConfig, getDefaultConfig, defaultFilterConfig };