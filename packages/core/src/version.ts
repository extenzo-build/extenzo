import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** @internal Resolve @extenzo/core package.json (from dist/esm: ../../package.json). */
const pkg = require("../../package.json") as { version?: string };

/**
 * Current extenzo (core) version, e.g. for extension error reports.
 */
export function getExtenzoVersion(): string {
  return pkg?.version ?? "0.0.0";
}
