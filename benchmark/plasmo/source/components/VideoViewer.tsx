import type { StoredVideo } from "../lib/constants";

export function VideoViewer({ video }: { video: StoredVideo | null }) {
  if (!video) {
    return (
      <p className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        暂无录制视频，请先在任意网页使用插件录制（单条限制 5MB）。
      </p>
    );
  }
  const url = URL.createObjectURL(video.blob);
  const sizeMB = (video.blob.size / (1024 * 1024)).toFixed(2);
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        大小: {sizeMB} MB · 录制于 {new Date(video.createdAt).toLocaleString()}
      </p>
      <video
        src={url}
        controls
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-black"
      />
    </div>
  );
}
