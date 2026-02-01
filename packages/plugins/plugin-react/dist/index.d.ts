import type { RsbuildPluginAPI } from "@rsbuild/core";
/** Return Rsbuild plugins to prepend before extenzo-react (so React is available before plugins init). */
export declare function getReactRsbuildPlugins(appRoot: string): unknown[];
/**
 * Rsbuild plugin for React + JSX.
 * Usage: import react from "@extenzo/plugin-react"; plugins: [react()]
 */
export declare function extenzoReactPlugin(): {
    name: string;
    setup(_api: RsbuildPluginAPI): void;
};
export default extenzoReactPlugin;
