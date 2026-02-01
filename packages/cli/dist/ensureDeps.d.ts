import type { ExtenzoResolvedConfig } from "@extenzo/core";
/**
 * 按业界常见方式：检查项目是否已安装扩展开发与插件所需的依赖，缺失则用当前包管理器自动安装。
 * 可通过环境变量 EXTENZO_SKIP_DEPS=1 跳过（如 CI 或用户已统一管理依赖）。
 */
export declare function ensureDependencies(root: string, config: ExtenzoResolvedConfig, options?: {
    silent?: boolean;
}): Promise<{
    installed: string[];
}>;
//# sourceMappingURL=ensureDeps.d.ts.map