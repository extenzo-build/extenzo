/**
 * 统一错误类型与错误输出，便于定位问题。
 */
export declare const EXTENZO_ERROR_CODES: {
    readonly CONFIG_NOT_FOUND: "EXTENZO_CONFIG_NOT_FOUND";
    readonly CONFIG_LOAD_FAILED: "EXTENZO_CONFIG_LOAD_FAILED";
    readonly MANIFEST_MISSING: "EXTENZO_MANIFEST_MISSING";
    readonly NO_ENTRIES: "EXTENZO_NO_ENTRIES";
    readonly INVALID_BROWSER: "EXTENZO_INVALID_BROWSER";
    readonly UNKNOWN_COMMAND: "EXTENZO_UNKNOWN_COMMAND";
    readonly RSBUILD_CONFIG_ERROR: "EXTENZO_RSBUILD_CONFIG_ERROR";
    readonly BUILD_ERROR: "EXTENZO_BUILD_ERROR";
    readonly ZIP_OUTPUT: "EXTENZO_ZIP_OUTPUT";
    readonly ZIP_ARCHIVE: "EXTENZO_ZIP_ARCHIVE";
};
export type ExtenzoErrorCode = (typeof EXTENZO_ERROR_CODES)[keyof typeof EXTENZO_ERROR_CODES];
export declare class ExtenzoError extends Error {
    readonly code: ExtenzoErrorCode;
    readonly details?: string;
    readonly hint?: string;
    constructor(message: string, options: {
        code: ExtenzoErrorCode;
        details?: string;
        hint?: string;
        cause?: unknown;
    });
}
/**
 * 向 stderr 输出错误信息并退出进程。
 * 用于 CLI 顶层 catch，保证错误原因清晰。
 */
export declare function exitWithError(err: unknown, exitCode?: number): never;
export declare function createConfigNotFoundError(root: string): ExtenzoError;
export declare function createConfigLoadError(filePath: string, cause: unknown): ExtenzoError;
export declare function createManifestMissingError(): ExtenzoError;
export declare function createNoEntriesError(srcDir: string): ExtenzoError;
export declare function createInvalidBrowserError(value: string): ExtenzoError;
export declare function createUnknownCommandError(cmd: string): ExtenzoError;
