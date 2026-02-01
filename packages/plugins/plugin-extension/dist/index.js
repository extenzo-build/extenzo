import { resolve } from "path";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { resolveManifestChromium, resolveManifestFirefox } from "@extenzo/core";
const NO_HTML_ENTRIES = [
    "background",
    "content"
];
function extensionPlugin(resolvedConfig, entries) {
    const { root, outDir, outputRoot, manifest } = resolvedConfig;
    const distPath = resolve(root, outputRoot, outDir);
    return {
        name: "extenzo-extension",
        setup (api) {
            api.onBeforeCreateCompiler(async ({ bundlerConfigs })=>{
                const config = bundlerConfigs[0];
                if (!config) return;
                config.plugins = config.plugins ?? [];
                config.plugins.push({
                    name: "extenzo-extension-post-build",
                    apply (compiler) {
                        compiler.hooks.afterEmit.tap("extenzo-extension-post-build", ()=>{
                            if (!existsSync(distPath)) mkdirSync(distPath, {
                                recursive: true
                            });
                            for (const name of NO_HTML_ENTRIES){
                                const nestedPath = resolve(distPath, name, "index.html");
                                const flatPath = resolve(distPath, `${name}.html`);
                                for (const htmlPath of [
                                    nestedPath,
                                    flatPath
                                ])if (existsSync(htmlPath)) try {
                                    unlinkSync(htmlPath);
                                } catch  {}
                            }
                            const browser = process.env.BROWSER || "chromium";
                            const manifestObj = "firefox" === browser ? resolveManifestFirefox(manifest, entries) : resolveManifestChromium(manifest, entries);
                            writeFileSync(resolve(distPath, "manifest.json"), JSON.stringify(manifestObj, null, 2), "utf-8");
                        });
                    }
                });
            });
        }
    };
}
export { extensionPlugin };

//# sourceMappingURL=index.js.map