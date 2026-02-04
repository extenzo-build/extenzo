import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import type { ManifestConfig, ManifestPathConfig } from "./types.ts";
import { MANIFEST_DIR, MANIFEST_FILE_NAMES } from "./constants.ts";

/**
 * Manifest 加载器：从 srcDir 读取 manifest 文件，或解析 ext.config 中的 manifest 对象/路径配置。
 */
export class ManifestLoader {
  private readManifestJson(filePath: string): Record<string, unknown> | null {
    if (!existsSync(filePath)) return null;
    try {
      const raw = readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      return typeof data === "object" && data !== null ? data : null;
    } catch {
      return null;
    }
  }

  private isManifestPathConfig(
    m: ManifestConfig | ManifestPathConfig | undefined
  ): m is ManifestPathConfig {
    if (!m || typeof m !== "object") return false;
    const c = m as Record<string, unknown>;
    return (
      (typeof c.chromium === "string" || typeof c.firefox === "string") &&
      !("manifest_version" in c) &&
      !("name" in c && "version" in c)
    );
  }

  private isChromiumFirefoxObject(
    m: ManifestConfig
  ): m is { chromium?: Record<string, unknown>; firefox?: Record<string, unknown> } {
    return typeof m === "object" && m !== null && ("chromium" in m || "firefox" in m);
  }

  private deepMerge(
    base: Record<string, unknown>,
    override: Record<string, unknown>
  ): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
      const b = base[key];
      const o = override[key];
      if (
        o !== null &&
        typeof o === "object" &&
        !Array.isArray(o) &&
        b !== null &&
        typeof b === "object" &&
        !Array.isArray(b)
      ) {
        out[key] = this.deepMerge(b as Record<string, unknown>, o as Record<string, unknown>);
      } else {
        out[key] = o;
      }
    }
    return out;
  }

  private loadFromDir(dir: string): {
    base: Record<string, unknown> | null;
    chromium: Record<string, unknown> | null;
    firefox: Record<string, unknown> | null;
  } {
    const basePath = resolve(dir, MANIFEST_FILE_NAMES.base);
    const chromPath = resolve(dir, MANIFEST_FILE_NAMES.chromium);
    const firefoxPath = resolve(dir, MANIFEST_FILE_NAMES.firefox);
    return {
      base: this.readManifestJson(basePath),
      chromium: this.readManifestJson(chromPath),
      firefox: this.readManifestJson(firefoxPath),
    };
  }

  private hasAnyManifest(files: {
    base: Record<string, unknown> | null;
    chromium: Record<string, unknown> | null;
    firefox: Record<string, unknown> | null;
  }): boolean {
    return files.base !== null || files.chromium !== null || files.firefox !== null;
  }

  private buildConfigFromFiles(files: {
    base: Record<string, unknown> | null;
    chromium: Record<string, unknown> | null;
    firefox: Record<string, unknown> | null;
  }): ManifestConfig | null {
    const base = files.base ?? files.chromium ?? files.firefox ?? null;
    if (!base) return null;
    const chromium = files.chromium ? this.deepMerge(base, files.chromium) : base;
    const firefox = files.firefox ? this.deepMerge(base, files.firefox) : base;
    return { chromium, firefox };
  }

  /**
   * 将用户配置的 manifest（对象 / 路径 / 未配置）解析为统一的 ManifestConfig（对象形式）。
   * 优先级：ext.config manifest 字段 > srcDir 下直接文件 > srcDir/manifest/ 下文件。
   */
  resolve(
    input: ManifestConfig | ManifestPathConfig | undefined,
    root: string,
    srcDir: string
  ): ManifestConfig | null {
    if (input === undefined || input === null) {
      const filesInSrcDir = this.loadFromDir(srcDir);
      if (this.hasAnyManifest(filesInSrcDir)) {
        return this.buildConfigFromFiles(filesInSrcDir);
      }
      const manifestSubdir = resolve(srcDir, MANIFEST_DIR);
      const filesInSubdir = this.loadFromDir(manifestSubdir);
      if (this.hasAnyManifest(filesInSubdir)) {
        return this.buildConfigFromFiles(filesInSubdir);
      }
      return null;
    }

    if (this.isManifestPathConfig(input)) {
      const result: { chromium?: Record<string, unknown>; firefox?: Record<string, unknown> } = {};
      if (input.chromium) {
        const obj = this.readManifestJson(resolve(srcDir, input.chromium));
        if (obj) result.chromium = obj;
      }
      if (input.firefox) {
        const obj = this.readManifestJson(resolve(srcDir, input.firefox));
        if (obj) result.firefox = obj;
      }
      const chrom = result.chromium ?? result.firefox;
      const ff = result.firefox ?? result.chromium;
      if (!chrom && !ff) return null;
      return { chromium: chrom ?? {}, firefox: ff ?? {} };
    }

    if (this.isChromiumFirefoxObject(input)) return input;
    return input as Record<string, unknown>;
  }
}

const defaultLoader = new ManifestLoader();

/**
 * 将用户配置的 manifest（对象 / 路径 / 未配置）解析为统一的 ManifestConfig（对象形式）。
 * 路径配置相对于 srcDir；未配置时从 srcDir 读取 manifest.json / manifest.chromium.json / manifest.firefox.json。
 */
export function resolveManifestInput(
  input: ManifestConfig | ManifestPathConfig | undefined,
  root: string,
  srcDir: string
): ManifestConfig | null {
  return defaultLoader.resolve(input, root, srcDir);
}
