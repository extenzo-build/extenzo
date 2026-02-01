import type { Compiler } from "@rspack/core";
export interface HmrPluginOptions {
    distPath: string;
    autoOpen?: boolean;
    browser?: "chromium" | "firefox";
    /** Chrome executable path (overrides .env BROWSER_CHROME). From config.launch.chrome. */
    chromePath?: string;
    /** Firefox executable path (overrides .env BROWSER_FIREFOX). From config.launch.firefox. */
    firefoxPath?: string;
    wsPort?: number;
    enableReload?: boolean;
}
export declare function notifyReload(): void;
/**
 * Rspack 插件：在 build watch 模式下，首次编译完成后启动浏览器，后续编译触发热重载。
 * 通过 tools.rspack.appendPlugins(hmrPlugin(options)) 注册，确保收到真实 compiler。
 */
export declare function hmrPlugin(options: HmrPluginOptions): {
    name: string;
    apply(compiler: Compiler): void;
};
