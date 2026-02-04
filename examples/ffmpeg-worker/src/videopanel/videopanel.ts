import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const CORE_VERSION = "0.12.6";
const BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

const logEl = document.getElementById("log") as HTMLPreElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;
const btnLoad = document.getElementById("btnLoad") as HTMLButtonElement;
const btnVersion = document.getElementById("btnVersion") as HTMLButtonElement;

function setStatus(text: string): void {
  if (statusEl) statusEl.textContent = text;
}

function appendLog(line: string): void {
  if (logEl) logEl.textContent += line + "\n";
}

function clearLog(): void {
  if (logEl) logEl.textContent = "";
}

const ffmpeg = new FFmpeg();

function bindLog(): void {
  ffmpeg.on("log", ({ message }) => appendLog(message));
}

async function loadFFmpeg(): Promise<void> {
  if (ffmpeg.loaded) return;
  setStatus("加载中…");
  clearLog();
  try {
    bindLog();
    const coreURL = await toBlobURL(`${BASE}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`${BASE}/ffmpeg-core.wasm`, "application/wasm");
    await ffmpeg.load({ coreURL, wasmURL });
    setStatus("已加载");
    if (btnVersion) btnVersion.disabled = false;
  } catch (e) {
    setStatus("加载失败");
    appendLog(String(e));
  }
}

async function runVersion(): Promise<void> {
  if (!ffmpeg.loaded) return;
  clearLog();
  setStatus("运行中…");
  try {
    const code = await ffmpeg.exec(["-version"]);
    setStatus(code === 0 ? "已加载" : "命令退出码: " + code);
  } catch (e) {
    setStatus("已加载");
    appendLog("Error: " + String(e));
  }
}

function init(): void {
  if (btnLoad) btnLoad.addEventListener("click", () => loadFFmpeg());
  if (btnVersion) btnVersion.addEventListener("click", () => runVersion());
}

init();
