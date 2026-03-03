/**
 * Offscreen document: receive stream id, get MediaStream, record and save to IndexedDB.
 */
import { createRecorder } from "../lib/recording";
import { saveVideo } from "../lib/db";
import { MAX_VIDEO_BYTES } from "../lib/constants";

let currentRecorder: ReturnType<typeof createRecorder> | null = null;
let currentStream: MediaStream | null = null;

function getStream(streamId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      } as unknown as MediaTrackConstraints,
    },
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      } as unknown as MediaTrackConstraints,
    },
  });
}

function stopTracks(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop());
}

chrome.runtime.onMessage.addListener(
  (msg: { target?: string; type: string; data?: string }, _sender, sendResponse) => {
    if (msg.target !== "offscreen") return false;

    if (msg.type === "start-recording" && msg.data) {
      (async () => {
        try {
          if (currentRecorder || currentStream) {
            currentRecorder?.stop();
            currentStream?.getTracks().forEach((t) => t.stop());
            currentRecorder = null;
            currentStream = null;
          }
          const stream = await getStream(msg.data!);
          currentStream = stream;
          currentRecorder = createRecorder(stream);
          currentRecorder.start();
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      })();
      return true;
    }

    if (msg.type === "stop-recording") {
      (async () => {
        try {
          if (!currentRecorder || !currentStream) {
            sendResponse({ ok: true });
            return;
          }
          const blob = await currentRecorder.stop();
          stopTracks(currentStream);
          currentStream = null;
          currentRecorder = null;
          if (blob && blob.size > 0 && blob.size <= MAX_VIDEO_BYTES) {
            await saveVideo(blob);
          }
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      })();
      return true;
    }
    return false;
  }
);
