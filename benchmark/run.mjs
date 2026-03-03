/**
 * Benchmark: 同一录屏插件在 extenzo / wxt / plasmo 下的 dev 就绪时间、HMR 时间、打包时间、打包体积。
 * 使用方式: 在 extenzo 仓库根目录执行 `node benchmark/run.mjs`
 * 依赖: 已安装各 benchmark 子项目 (pnpm install)
 */
import { spawn } from "node:child_process";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const BENCH_DIR = join(ROOT, "benchmark");
const FRAMEWORKS = [
  {
    name: "extenzo",
    cwd: join(BENCH_DIR, "extenzo"),
    devCommand: "pnpm run dev",
    buildCommand: "pnpm run build",
    buildOutDir: join(BENCH_DIR, "extenzo", ".extenzo", "dist"),
    devReadyPattern: /ready\s+built in|Done.*Parse entries/,
    hmrPattern: /built in|hmr|reload/i,
  },
  {
    name: "wxt",
    cwd: join(BENCH_DIR, "wxt"),
    devCommand: "pnpm run dev",
    buildCommand: "pnpm run build",
    buildOutDir: join(BENCH_DIR, "wxt", ".output", "chrome-mv3"),
    devReadyPattern: /ready|Built in|Local:/i,
    hmrPattern: /hmr|reload|built in/i,
  },
  {
    name: "plasmo",
    cwd: join(BENCH_DIR, "plasmo"),
    devCommand: "pnpm run dev",
    buildCommand: "pnpm run build",
    buildOutDir: join(BENCH_DIR, "plasmo", "build", "chrome-mv3-prod"),
    devReadyPattern: /ready|Built|created build/i,
    hmrPattern: /hmr|reload|built/i,
  },
];

function run(cmd, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const [exe, ...args] = cmd.split(/\s+/);
    const proc = spawn(exe, args, {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function runWithTiming(cmd, cwd) {
  return new Promise((resolve) => {
    const [exe, ...args] = cmd.split(/\s+/);
    const start = Date.now();
    const proc = spawn(exe, args, {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      stdout += d.toString();
    });
    proc.on("close", () => {
      resolve({ ms: Date.now() - start, stdout });
    });
  });
}

function runDevUntilReady(fw) {
  return new Promise((resolve) => {
    const [exe, ...args] = fw.devCommand.split(/\s+/);
    const start = Date.now();
    const proc = spawn(exe, args, {
      cwd: fw.cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    const onData = (d) => {
      stdout += d.toString();
      if (fw.devReadyPattern.test(stdout)) {
        proc.kill("SIGTERM");
        resolve(Date.now() - start);
      }
    };
    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", onData);
    proc.on("close", () => resolve(-1));
    setTimeout(() => {
      try { proc.kill("SIGTERM"); } catch (_) {}
      resolve(stdout ? Date.now() - start : -1);
    }, 120000);
  });
}

function dirSize(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) total += dirSize(p);
      else total += statSync(p).size;
    }
  } catch (_) {}
  return total;
}

async function main() {
  const runDev = process.argv.includes("--dev");
  const results = [];

  for (const fw of FRAMEWORKS) {
    if (!existsSync(fw.cwd)) {
      console.log(`\n[${fw.name}] 跳过 (目录不存在: ${fw.cwd})`);
      continue;
    }
    const row = { name: fw.name, devMs: null, hmrMs: null, buildMs: null, sizeBytes: null };

    if (runDev) {
      console.log(`\n[${fw.name}] Dev 启动中 (等待 ready)...`);
      row.devMs = await runDevUntilReady(fw);
      console.log(`  Dev 就绪: ${row.devMs >= 0 ? (row.devMs / 1000).toFixed(2) + "s" : "超时/未匹配"}`);
    }

    console.log(`\n[${fw.name}] Building...`);
    const buildResult = await runWithTiming(fw.buildCommand, fw.cwd);
    row.buildMs = buildResult.ms;
    if (existsSync(fw.buildOutDir)) {
      row.sizeBytes = dirSize(fw.buildOutDir);
    } else {
      const alt = join(fw.cwd, "dist");
      const alt2 = join(fw.cwd, "build", "chrome-mv3-prod");
      if (existsSync(alt)) row.sizeBytes = dirSize(alt);
      else if (existsSync(alt2)) row.sizeBytes = dirSize(alt2);
    }
    results.push(row);
    console.log(`  Build: ${(row.buildMs / 1000).toFixed(2)}s, Size: ${(row.sizeBytes / 1024).toFixed(1)} KB`);
  }

  console.log("\n========== Benchmark 汇总 ==========");
  if (runDev) {
    console.log("| Framework | Dev 就绪 (s) | Build (s) | 体积 (KB) |");
    console.log("|------------|---------------|-----------|------------|");
    for (const r of results) {
      const devS = r.devMs != null && r.devMs >= 0 ? (r.devMs / 1000).toFixed(2) : "-";
      const buildS = r.buildMs != null ? (r.buildMs / 1000).toFixed(2) : "-";
      const sizeK = r.sizeBytes != null ? (r.sizeBytes / 1024).toFixed(1) : "-";
      console.log(`| ${r.name.padEnd(10)} | ${String(devS).padStart(13)} | ${String(buildS).padStart(9)} | ${String(sizeK).padStart(10)} |`);
    }
  } else {
    console.log("| Framework | Build (s) | 体积 (KB) |");
    console.log("|-----------|-----------|------------|");
    for (const r of results) {
      const buildS = r.buildMs != null ? (r.buildMs / 1000).toFixed(2) : "-";
      const sizeK = r.sizeBytes != null ? (r.sizeBytes / 1024).toFixed(1) : "-";
      console.log(`| ${r.name.padEnd(9)} | ${String(buildS).padStart(9)} | ${String(sizeK).padStart(10)} |`);
    }
    console.log("\n提示: 带 --dev 可测量 Dev 就绪时间: node benchmark/run.mjs --dev");
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
