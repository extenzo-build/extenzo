import { useState, useEffect } from "react";
import { getVideo, clearVideo } from "../lib/db";
import { VideoViewer } from "./VideoViewer";

export function OptionsApp() {
  const [video, setVideo] = useState<{ id: string; blob: Blob; createdAt: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVideo()
      .then(setVideo)
      .finally(() => setLoading(false));
  }, []);

  const handleClear = () => {
    clearVideo().then(() => setVideo(null));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-500">加载中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold text-slate-800">录制的视频</h1>
        <VideoViewer video={video} />
        {video && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            删除视频
          </button>
        )}
      </div>
    </div>
  );
}
