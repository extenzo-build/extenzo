import type { RsbuildConfig } from "@rsbuild/core";
/**
 * Deep-merge user rsbuildConfig into base.
 * plugins arrays are concatenated (base.plugins then user.plugins); other keys deep-merge with user winning.
 */
export declare function mergeRsbuildConfig(base: RsbuildConfig, user: RsbuildConfig): RsbuildConfig;
