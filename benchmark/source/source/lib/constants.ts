/** Max stored video size: 5MB */
export const MAX_VIDEO_BYTES = 5 * 1024 * 1024;

export const DB_NAME = "benchmark-recorder-db";
export const STORE_NAME = "videos";
export const VIDEO_KEY = "single-video";

export interface StoredVideo {
  id: string;
  blob: Blob;
  createdAt: number;
}
