import { useState } from "react";

const OPEN_OPTIONS = "open-options";

export function PopupApp() {
  const [recording, setRecording] = useState(false);

  const handleStart = () => {
    chrome.runtime.sendMessage({ type: "start-recording" }).then(() => setRecording(true));
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({ type: "stop-recording" }).then(() => setRecording(false));
  };

  const openOptions = () => {
    chrome.runtime.sendMessage({ type: OPEN_OPTIONS });
  };

  return (
    <div className="w-72 bg-white p-4 shadow-lg">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">网页录制</h2>
      <p className="mb-3 text-xs text-slate-500">仅支持 1 条视频，最大 5MB</p>
      <div className="flex flex-col gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={handleStart}
            className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            开始录制
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStop}
            className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            停止录制
          </button>
        )}
        <button
          type="button"
          onClick={openOptions}
          className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          查看已录制视频
        </button>
      </div>
    </div>
  );
}
