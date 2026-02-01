import { createRequire } from "module";
import { resolve } from "path";
function createAppRequire(appRoot) {
    return createRequire(resolve(appRoot, "package.json"));
}
function getVueRsbuildPlugins(appRoot) {
    const appRequire = createAppRequire(appRoot);
    try {
        const { pluginVue } = appRequire("@rsbuild/plugin-vue");
        const { pluginBabel } = appRequire("@rsbuild/plugin-babel");
        return [
            pluginBabel({
                include: /\.(?:jsx|tsx)$/,
                babelLoaderOptions: (opts, utils)=>{
                    if ("function" == typeof utils?.addPlugins) utils.addPlugins([
                        "@vue/babel-plugin-jsx"
                    ]);
                    else {
                        const list = opts.plugins ?? [];
                        if (!list.some((p)=>"string" == typeof p && p.includes("babel-plugin-jsx") || Array.isArray(p) && String(p[0]).includes("babel-plugin-jsx"))) opts.plugins = [
                            ...list,
                            "@vue/babel-plugin-jsx"
                        ];
                    }
                    return opts;
                }
            }),
            pluginVue()
        ];
    } catch  {
        return [];
    }
}
function extenzoVuePlugin() {
    return {
        name: "extenzo-vue",
        enforce: "pre",
        setup () {}
    };
}
const src = extenzoVuePlugin;
export default src;
export { extenzoVuePlugin, getVueRsbuildPlugins };

//# sourceMappingURL=index.js.map