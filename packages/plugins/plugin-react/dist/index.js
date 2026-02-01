import { createRequire } from "module";
import { resolve } from "path";
function createAppRequire(appRoot) {
    return createRequire(resolve(appRoot, "package.json"));
}
function getReactRsbuildPlugins(appRoot) {
    const appRequire = createAppRequire(appRoot);
    try {
        const { pluginReact } = appRequire("@rsbuild/plugin-react");
        return [
            pluginReact()
        ];
    } catch  {
        return [];
    }
}
function extenzoReactPlugin() {
    return {
        name: "extenzo-react",
        setup (_api) {}
    };
}
const src = extenzoReactPlugin;
export default src;
export { extenzoReactPlugin, getReactRsbuildPlugins };

//# sourceMappingURL=index.js.map