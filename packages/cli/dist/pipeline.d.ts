import { CliParser, ConfigLoader } from "@extenzo/core";
import type { PipelineContext } from "@extenzo/core";
/**
 * 构建流水线：串联 CLI 解析 → 配置加载 → Rsbuild 配置生成 → 钩子执行。
 */
export declare class Pipeline {
    private readonly configLoader;
    private readonly cliParser;
    constructor(configLoader?: ConfigLoader, cliParser?: CliParser);
    run(root: string, argv: string[]): Promise<PipelineContext>;
    private expandFrameworkPlugins;
    private buildBaseRsbuildConfig;
    private applyUserRsbuildConfig;
    private injectHmrForDev;
}
export declare function runPipeline(root: string, argv: string[]): Promise<PipelineContext>;
//# sourceMappingURL=pipeline.d.ts.map