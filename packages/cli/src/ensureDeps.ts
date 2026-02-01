import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { spawnSync } from "child_process";
import type { ExtenzoResolvedConfig } from "@extenzo/core";

/** 扩展开发推荐/必选 devDependencies：未安装时由框架自动安装（业界常见：按需补齐） */
const EXTENSION_DEV_DEPS = ["@types/chrome"] as const;

/** 框架插件名 → 用户项目需安装的运行时依赖（peer 概念，未装则自动安装） */
const PLUGIN_PEER_DEPS: Record<string, readonly string[]> = {
  "extenzo-vue": ["vue"],
  "extenzo-react": ["react", "react-dom"],
};

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

function detectPackageManager(root: string): PackageManager {
  if (existsSync(resolve(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(resolve(root, "bun.lockb"))) return "bun";
  if (existsSync(resolve(root, "yarn.lock"))) return "yarn";
  if (existsSync(resolve(root, "package-lock.json"))) return "npm";
  return "pnpm";
}

function readProjectPackageJson(root: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null {
  const p = resolve(root, "package.json");
  if (!existsSync(p)) return null;
  try {
    const raw = readFileSync(p, "utf-8");
    return JSON.parse(raw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  } catch {
    return null;
  }
}

function isPackageInManifest(root: string, name: string): boolean {
  const pkg = readProjectPackageJson(root);
  if (!pkg) return false;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return typeof deps === "object" && Object.prototype.hasOwnProperty.call(deps, name);
}

function getPluginNamesFromConfig(config: ExtenzoResolvedConfig): string[] {
  const plugins = config.plugins;
  if (!plugins) return [];
  const list = Array.isArray(plugins) ? plugins : [plugins];
  const names: string[] = [];
  for (const p of list) {
    if (p && typeof p === "object" && "name" in p && typeof (p as { name?: string }).name === "string")
      names.push((p as { name: string }).name);
  }
  return names;
}

function collectPackagesToInstall(root: string, config: ExtenzoResolvedConfig): string[] {
  const toInstall: string[] = [];
  for (const name of EXTENSION_DEV_DEPS) {
    if (!isPackageInManifest(root, name)) toInstall.push(name);
  }
  const pluginNames = getPluginNamesFromConfig(config);
  for (const [pluginName, peers] of Object.entries(PLUGIN_PEER_DEPS)) {
    if (!pluginNames.includes(pluginName)) continue;
    for (const pkg of peers) {
      if (!isPackageInManifest(root, pkg)) toInstall.push(pkg);
    }
  }
  return [...new Set(toInstall)];
}

function runInstall(root: string, pm: PackageManager, packages: string[], dev: boolean): boolean {
  let cmd: string;
  let args: string[];
  if (pm === "npm") {
    cmd = "npm";
    args = dev ? ["install", "-D", ...packages] : ["install", ...packages];
  } else if (pm === "bun") {
    cmd = "bun";
    args = dev ? ["add", "-d", ...packages] : ["add", ...packages];
  } else {
    cmd = pm;
    args = dev ? ["add", "-D", ...packages] : ["add", ...packages];
  }
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  return result.status === 0;
}

/**
 * 按业界常见方式：检查项目是否已安装扩展开发与插件所需的依赖，缺失则用当前包管理器自动安装。
 * 可通过环境变量 EXTENZO_SKIP_DEPS=1 跳过（如 CI 或用户已统一管理依赖）。
 */
export async function ensureDependencies(
  root: string,
  config: ExtenzoResolvedConfig,
  options?: { silent?: boolean }
): Promise<{ installed: string[] }> {
  if (process.env.EXTENZO_SKIP_DEPS === "1") return { installed: [] };

  const toInstall = collectPackagesToInstall(root, config);
  if (toInstall.length === 0) return { installed: [] };

  if (!options?.silent) {
    console.log(`[extenzo] Ensuring dev dependencies: ${toInstall.join(", ")}`);
  }
  const pm = detectPackageManager(root);
  const ok = runInstall(root, pm, toInstall, true);
  if (!ok && !options?.silent) {
    console.warn(`[extenzo] Failed to install some dependencies. You may run: ${pm} add -D ${toInstall.join(" ")}`);
  }
  return { installed: ok ? toInstall : [] };
}
