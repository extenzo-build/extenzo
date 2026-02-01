/**
 * 统一错误类型与错误输出，便于定位问题。
 */

export const EXTENZO_ERROR_CODES = {
  CONFIG_NOT_FOUND: "EXTENZO_CONFIG_NOT_FOUND",
  CONFIG_LOAD_FAILED: "EXTENZO_CONFIG_LOAD_FAILED",
  MANIFEST_MISSING: "EXTENZO_MANIFEST_MISSING",
  NO_ENTRIES: "EXTENZO_NO_ENTRIES",
  INVALID_BROWSER: "EXTENZO_INVALID_BROWSER",
  UNKNOWN_COMMAND: "EXTENZO_UNKNOWN_COMMAND",
  RSBUILD_CONFIG_ERROR: "EXTENZO_RSBUILD_CONFIG_ERROR",
  BUILD_ERROR: "EXTENZO_BUILD_ERROR",
  ZIP_OUTPUT: "EXTENZO_ZIP_OUTPUT",
  ZIP_ARCHIVE: "EXTENZO_ZIP_ARCHIVE",
} as const;

export type ExtenzoErrorCode = (typeof EXTENZO_ERROR_CODES)[keyof typeof EXTENZO_ERROR_CODES];

export class ExtenzoError extends Error {
  readonly code: ExtenzoErrorCode;
  readonly details?: string;
  readonly hint?: string;

  constructor(
    message: string,
    options: { code: ExtenzoErrorCode; details?: string; hint?: string; cause?: unknown }
  ) {
    super(message);
    this.name = "ExtenzoError";
    this.code = options.code;
    this.details = options.details;
    this.hint = options.hint;
    if (options.cause !== undefined) (this as Error & { cause?: unknown }).cause = options.cause;
  }
}

function formatError(err: unknown): string {
  if (err instanceof ExtenzoError) {
    const parts = [`[${err.code}] ${err.message}`];
    if (err.details) parts.push(`  详情: ${err.details}`);
    if (err.hint) parts.push(`  建议: ${err.hint}`);
    return parts.join("\n");
  }
  if (err instanceof Error) return err.stack ?? err.message;
  return String(err);
}

/**
 * 向 stderr 输出错误信息并退出进程。
 * 用于 CLI 顶层 catch，保证错误原因清晰。
 */
export function exitWithError(err: unknown, exitCode = 1): never {
  console.error("\n" + formatError(err));
  process.exit(exitCode);
}

export function createConfigNotFoundError(root: string): ExtenzoError {
  return new ExtenzoError("未找到 extenzo 配置文件", {
    code: EXTENZO_ERROR_CODES.CONFIG_NOT_FOUND,
    details: `在目录 ${root} 下未找到 ext.config.ts、ext.config.js 或 ext.config.mjs`,
    hint: "请在项目根目录执行命令，或新建 ext.config.ts / ext.config.js",
  });
}

export function createConfigLoadError(filePath: string, cause: unknown): ExtenzoError {
  const message = cause instanceof Error ? cause.message : String(cause);
  return new ExtenzoError("加载配置文件失败", {
    code: EXTENZO_ERROR_CODES.CONFIG_LOAD_FAILED,
    details: `文件: ${filePath}，错误: ${message}`,
    hint: "检查 ext.config 语法与依赖是否正确",
    cause: cause instanceof Error ? cause : undefined,
  });
}

export function createManifestMissingError(): ExtenzoError {
  return new ExtenzoError("配置中缺少 manifest 字段", {
    code: EXTENZO_ERROR_CODES.MANIFEST_MISSING,
    details: "defineConfig 返回的对象必须包含 manifest（或 chromium / firefox 分支）",
    hint: "在 ext.config 中添加 manifest: { name, version, manifest_version, ... }",
  });
}

export function createNoEntriesError(srcDir: string): ExtenzoError {
  return new ExtenzoError("未发现任何入口", {
    code: EXTENZO_ERROR_CODES.NO_ENTRIES,
    details: `在 ${srcDir} 下未找到 background、content、popup、options 或 sidepanel 任一入口`,
    hint: "至少需要其一目录，且包含 index.ts / index.js 等入口文件",
  });
}

export function createInvalidBrowserError(value: string): ExtenzoError {
  return new ExtenzoError("不支持的浏览器参数", {
    code: EXTENZO_ERROR_CODES.INVALID_BROWSER,
    details: `当前值: "${value}"`,
    hint: "请使用 -b chrome 或 -b firefox，不传时默认 chrome",
  });
}

export function createUnknownCommandError(cmd: string): ExtenzoError {
  return new ExtenzoError("未知命令", {
    code: EXTENZO_ERROR_CODES.UNKNOWN_COMMAND,
    details: `命令: "${cmd}"`,
    hint: "支持: extenzo dev | extenzo build [-b chrome|firefox]",
  });
}
