import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { gunzipSync } from "node:zlib";

const GITHUB_REPO = "gxy5202/extenzo";
const TEMPLATE_BASE = "packages/create-extenzo-app/templates";

export interface TarHeader {
  name: string;
  size: number;
  type: string;
}

export function parseTarHeader(buf: Buffer): TarHeader | null {
  if (buf.every((b) => b === 0)) return null;

  const rawName = buf.subarray(0, 100).toString("utf8").replace(/\0+$/, "");
  const sizeStr = buf.subarray(124, 136).toString("utf8").replace(/\0+$/, "").trim();
  const type = String.fromCharCode(buf[156]);
  const prefix = buf.subarray(345, 500).toString("utf8").replace(/\0+$/, "");

  return {
    name: prefix ? `${prefix}/${rawName}` : rawName,
    size: parseInt(sizeStr, 8) || 0,
    type,
  };
}

export function extractMatchingFiles(
  tarBuffer: Buffer,
  templatePrefix: string,
  destDir: string,
): void {
  let offset = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = parseTarHeader(tarBuffer.subarray(offset, offset + 512));
    offset += 512;
    if (!header) break;

    const dataBlocks = Math.ceil(header.size / 512) * 512;
    const idx = header.name.indexOf(templatePrefix);

    if (idx !== -1) {
      const relativePath = header.name.substring(idx + templatePrefix.length).replace(/^\//, "");
      if (relativePath) {
        const destPath = join(destDir, relativePath);
        const isDir = header.type === "5" || relativePath.endsWith("/");

        if (isDir) {
          mkdirSync(destPath, { recursive: true });
        } else if (header.type === "0" || header.type === "\0") {
          mkdirSync(dirname(destPath), { recursive: true });
          writeFileSync(destPath, tarBuffer.subarray(offset, offset + header.size));
        }
      }
    }

    offset += dataBlocks;
  }
}

/* istanbul ignore next -- network I/O, tested via integration */
export async function downloadTemplate(
  templateName: string,
  destDir: string,
  branch = "main",
): Promise<void> {
  const url = `https://codeload.github.com/${GITHUB_REPO}/tar.gz/${branch}`;
  const templatePrefix = `${TEMPLATE_BASE}/${templateName}/`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const compressed = Buffer.from(await response.arrayBuffer());
  const tarBuffer = gunzipSync(compressed);

  mkdirSync(destDir, { recursive: true });
  extractMatchingFiles(tarBuffer, templatePrefix, destDir);
}
