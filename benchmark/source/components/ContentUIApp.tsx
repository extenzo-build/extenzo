import "../styles/index.css";
import { useState } from "react";

export function ContentUIApp() {
  const [recording, setRecording] = useState(false);

  const handleStart = () => {
    chrome.runtime.sendMessage({ type: "start-recording" }).then(() => setRecording(true));
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({ type: "stop-recording" }).then(() => setRecording(false));
  };

  const openOptions = () => {
    chrome.runtime.sendMessage({ type: "open-options" });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <h2 className="mb-2 text-sm font-semibold text-slate-800">网页录制</h2>
      <p className="mb-3 text-xs text-slate-500">单条 5MB 内，存于 IndexedDB</p>
      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={handleStart}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            开始录制
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStop}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            停止录制
          </button>
        )}
        <button
          type="button"
          onClick={openOptions}
          className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300"
        >
          查看视频
        </button>
      </div>
    </div>
  );
}
