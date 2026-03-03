import { MAX_VIDEO_BYTES } from "./constants";
import { saveVideo } from "./db";

export type RecordingState = "idle" | "recording" | "stopping";

const MIME = "video/webm;codecs=vp9";

export function createRecorder(stream: MediaStream): {
  start: () => void;
  stop: () => Promise<Blob | null>;
  getState: () => RecordingState;
} {
  let state: RecordingState = "idle";
  let recorder: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  let totalBytes = 0;

  const getState = (): RecordingState => state;

  const start = (): void => {
    if (state !== "idle" || recorder) return;
    chunks.length = 0;
    totalBytes = 0;
    const mime = MediaRecorder.isTypeSupported(MIME) ? MIME : "video/webm";
    recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        totalBytes += e.data.size;
        if (totalBytes > MAX_VIDEO_BYTES) {
          recorder?.stop();
        }
      }
    };
    recorder.start(200);
    state = "recording";
  };

  const stop = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (state !== "recording" || !recorder) {
        resolve(null);
        return;
      }
      state = "stopping";
      recorder.onstop = () => {
        state = "idle";
        recorder = null;
        if (chunks.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunks, { type: chunks[0].type });
        resolve(blob);
      };
      recorder.stop();
    });
  };

  return { start, stop, getState };
}

export async function recordAndSave(stream: MediaStream): Promise<boolean> {
  const { start, stop } = createRecorder(stream);
  start();
  const blob = await stop();
  if (!blob || blob.size > MAX_VIDEO_BYTES) return false;
  await saveVideo(blob);
  return true;
}
