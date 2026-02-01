/** Return Rsbuild plugins to prepend before extenzo-vue (so Vue/Babel are available before plugins init). */
export declare function getVueRsbuildPlugins(appRoot: string): unknown[];
/**
 * Rsbuild plugin for Vue 3 + Vue JSX + Less + Babel.
 * Usage: import vue from "@extenzo/plugin-vue"; plugins: [vue()]
 */
export declare function extenzoVuePlugin(): {
    name: string;
    enforce: "pre";
    setup(): void;
};
export default extenzoVuePlugin;
