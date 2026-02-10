import { resolve, dirname } from "path";
import { readFileSync } from "fs";
import type { ScriptInjectPosition } from "./types.ts";

export type { ScriptInjectPosition };

export interface ExtenzoEntryScriptResult {
  /** Resolved src attribute value (relative path) */
  src: string;
  /** Where the script tag sits: head or body */
  inject: ScriptInjectPosition;
  /** HTML content with the data-extenzo-entry script tag removed */
  strippedHtml: string;
}

const ENTRY_SCRIPT_REGEX =
  /<script\b[^>]*data-extenzo-entry[^>]*>[\s\S]*?<\/script>/gi;
const HEAD_CLOSE_REGEX = /<\/head\s*>/i;

/**
 * Parses HTML at htmlPath for the script tag with data-extenzo-entry and src.
 * Returns src, inject position (head vs body), and HTML with that script tag removed.
 * If no such tag is found or it has no src, returns undefined.
 */
export function parseExtenzoEntryFromHtml(
  htmlPath: string
): ExtenzoEntryScriptResult | undefined {
  const raw = readFileSync(htmlPath, "utf-8");
  const reg = new RegExp(ENTRY_SCRIPT_REGEX.source, "gi");
  const match = reg.exec(raw);
  if (!match) return undefined;
  const tag = match[0];
  const tagStartIndex = match.index;
  const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i);
  if (!srcMatch?.[1]) return undefined;
  const src = srcMatch[1];
  const headCloseMatch = raw.match(HEAD_CLOSE_REGEX);
  const headCloseIndex = headCloseMatch?.index ?? -1;
  const inject: ScriptInjectPosition =
    headCloseIndex >= 0 && tagStartIndex < headCloseIndex ? "head" : "body";
  const strippedHtml = raw.replace(ENTRY_SCRIPT_REGEX, "").trimEnd();
  return { src, inject, strippedHtml };
}

/**
 * If html has data-extenzo-entry and its script src resolves to the same path as scriptPath,
 * returns the inject position so the entry can use stripped template and html.inject.
 */
export function getScriptInjectIfMatches(
  htmlPath: string,
  scriptPath: string
): ScriptInjectPosition | undefined {
  try {
    const parsed = parseExtenzoEntryFromHtml(htmlPath);
    if (!parsed) return undefined;
    const resolvedFromHtml = resolve(dirname(htmlPath), parsed.src);
    return resolvedFromHtml === scriptPath ? parsed.inject : undefined;
  } catch {
    return undefined;
  }
}
