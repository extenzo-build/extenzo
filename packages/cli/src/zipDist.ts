import { createWriteStream, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import archiver from "archiver";
import type { ExtenzoErrorCode } from "@extenzo/core";
import { ExtenzoError, EXTENZO_OUTPUT_ROOT } from "@extenzo/core";

/** Error codes for zip operations; match core EXTENZO_ERROR_CODES */
const ZIP_OUTPUT_CODE = "EXTENZO_ZIP_OUTPUT" as ExtenzoErrorCode;
const ZIP_ARCHIVE_CODE = "EXTENZO_ZIP_ARCHIVE" as ExtenzoErrorCode;

/** Default zlib level for zip compression */
const ZIP_LEVEL = 9;

/** Optional for tests: inject stream/archiver to trigger error paths */
export type ZipDistDeps = {
  createWriteStream?: typeof createWriteStream;
  archiver?: typeof archiver;
  mkdirSync?: typeof mkdirSync;
  existsSync?: typeof existsSync;
};

/**
 * Packs the built output directory into a zip file.
 * Output: root/.extenzo/<outDir>.zip (filename same as outDir, inside .extenzo).
 * Zip contents are the files inside distPath (no extra top-level folder).
 */
export function zipDist(
  distPath: string,
  root: string,
  outDir: string,
  deps?: ZipDistDeps
): Promise<string> {
  const createStream = deps?.createWriteStream ?? createWriteStream;
  const archiverFn = deps?.archiver ?? archiver;
  const mkdir = deps?.mkdirSync ?? mkdirSync;
  const exists = deps?.existsSync ?? existsSync;
  const outputRoot = EXTENZO_OUTPUT_ROOT;
  const zipDir = resolve(root, outputRoot);
  if (!exists(zipDir)) mkdir(zipDir, { recursive: true });
  const zipPath = resolve(zipDir, `${outDir}.zip`);
  const output = createStream(zipPath);
  const archive = archiverFn("zip", { zlib: { level: ZIP_LEVEL } });

  return new Promise((resolvePromise, reject) => {
    output.on("error", (err) =>
      reject(
        new ExtenzoError("Zip output stream failed", {
          code: ZIP_OUTPUT_CODE,
          details: err instanceof Error ? err.message : String(err),
          cause: err,
        })
      )
    );
    output.on("close", () => resolvePromise(zipPath));

    archive.on("error", (err: unknown) =>
      reject(
        new ExtenzoError("Zip archive failed", {
          code: ZIP_ARCHIVE_CODE,
          details: err instanceof Error ? err.message : String(err),
          cause: err,
        })
      )
    );
    archive.pipe(output);
    archive.directory(distPath, false);
    archive.finalize();
  });
}
