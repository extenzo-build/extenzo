import { createWriteStream } from "fs";
import { resolve } from "path";
import archiver from "archiver";
import type { ExtenzoErrorCode } from "@extenzo/core";
import { ExtenzoError } from "@extenzo/core";

/** Error codes for zip operations; match core EXTENZO_ERROR_CODES */
const ZIP_OUTPUT_CODE = "EXTENZO_ZIP_OUTPUT" as ExtenzoErrorCode;
const ZIP_ARCHIVE_CODE = "EXTENZO_ZIP_ARCHIVE" as ExtenzoErrorCode;

/** Default zlib level for zip compression */
const ZIP_LEVEL = 9;

/**
 * Packs the built output directory into a zip file at project root.
 * Zip contents are the files inside distPath (no extra top-level folder).
 */
export function zipDist(
  distPath: string,
  root: string,
  outDir: string
): Promise<string> {
  const zipPath = resolve(root, `${outDir}.zip`);
  const output = createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: ZIP_LEVEL } });

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
