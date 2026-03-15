import React from "react";
import { TerminalChrome } from "./TerminalChrome";
import { termLine } from "./terminalStyles";

export function FeatureHmrFlow() {
  return (
    <svg viewBox="0 0 320 140" className="w-full h-full min-h-[120px]" fill="none" stroke="currentColor">
      <defs>
        <linearGradient id="exo-flow-line-gradient" x1="0" y1="0.5" x2="1" y2="0.5" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="var(--exo-home-muted)" />
          <stop offset="0.3" stopColor="var(--rp-c-brand, #f97316)" />
          <stop offset="0.7" stopColor="var(--rp-c-brand, #f97316)" />
          <stop offset="1" stopColor="var(--exo-home-muted)" />
        </linearGradient>
        <linearGradient id="exo-flow-line-gradient-vertical" x1="0.5" y1="1" x2="0.5" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="var(--exo-home-muted)" />
          <stop offset="0.3" stopColor="var(--rp-c-brand, #f97316)" />
          <stop offset="0.7" stopColor="var(--rp-c-brand, #f97316)" />
          <stop offset="1" stopColor="var(--exo-home-muted)" />
        </linearGradient>
      </defs>
      {/* 连接线：Rsbuild→Extension/Extenzo, Extenzo→Reloader, Reloader→Extension，圆弧弯线 + 动画 */}
      <g aria-hidden>
        <path d="M 160 98 Q 220 88 228 78" className="exo-flow-gradient" />
        <path d="M 160 98 Q 155 68 150 50" className="exo-flow-gradient" />
        <path d="M 228 60 Q 158 62 88 50" className="exo-flow-gradient" />
        <path d="M 88 34 Q 103 28 118 34" className="exo-flow-gradient" />
      </g>
      {/* 第三层：Reloader、Extension（Extenzo 左上方） */}
      <rect x="24" y="18" width="64" height="32" rx="4" fill="none" stroke="var(--exo-home-border)" strokeWidth="1" />
      <text x="56" y="38" textAnchor="middle" fontSize="8" fontWeight="300" fill="var(--exo-home-text)" stroke="none" fontFamily="system-ui, sans-serif">Reloader</text>
      <rect x="118" y="18" width="64" height="32" rx="4" fill="none" stroke="var(--exo-home-border)" strokeWidth="1" />
      <text x="150" y="38" textAnchor="middle" fontSize="8" fontWeight="300" fill="var(--exo-home-text)" stroke="none" fontFamily="system-ui, sans-serif">Extension</text>
      {/* 第二层：Extenzo（右上方） */}
      <rect x="228" y="42" width="72" height="36" rx="4" fill="none" stroke="var(--rp-c-brand, #f97316)" strokeWidth="1" />
      <text x="264" y="63" textAnchor="middle" fontSize="9" fontWeight="300" fill="var(--exo-home-text)" stroke="none" fontFamily="system-ui, sans-serif">Extenzo</text>
      {/* 第一层：Rsbuild（底部中间） */}
      <rect x="124" y="98" width="72" height="36" rx="4" fill="none" stroke="var(--exo-home-border)" strokeWidth="1" />
      <text x="160" y="120" textAnchor="middle" fontSize="9" fontWeight="300" fill="var(--exo-home-text)" stroke="none" fontFamily="system-ui, sans-serif">Rsbuild</text>
    </svg>
  );
}

/** 线上免费图标：@browser-logos (jsDelivr)、simpleicons、GitHub 头像 */
const BROWSER_ICONS: Record<string, string> = {
  Chrome: "https://cdn.jsdelivr.net/npm/@browser-logos/chrome/chrome.svg",
  Firefox: "https://cdn.jsdelivr.net/npm/@browser-logos/firefox/firefox.svg",
  Opera: "https://cdn.jsdelivr.net/npm/@browser-logos/opera/opera.svg",
  Brave: "https://cdn.jsdelivr.net/npm/@browser-logos/brave/brave.svg",
  Vivaldi: "https://cdn.jsdelivr.net/npm/@browser-logos/vivaldi/vivaldi.svg",
  Arc: "https://cdn.simpleicons.org/arc",
  Yandex: "https://cdn.jsdelivr.net/npm/@browser-logos/yandex/yandex_48x48.png",
  Chromium: "https://cdn.jsdelivr.net/npm/@browser-logos/chromium/chromium.svg",
};

const BROWSER_NAMES = ["Chrome", "Firefox", "Opera", "Brave", "Vivaldi", "Arc", "Yandex", "Chromium"];

const ROW1 = BROWSER_NAMES.slice(0, 4);
const ROW2 = BROWSER_NAMES.slice(4);

export function FeatureBrowsers() {
  return (
    <div className="relative w-full overflow-hidden rounded-md p-3 pt-6">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-6">
          {ROW1.map((name, i) => (
            <span
              key={name}
              className="exo-fall-icon flex items-center justify-center"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <img
                src={BROWSER_ICONS[name]}
                alt={name}
                title={name}
                className="w-12 h-12 object-contain opacity-90"
              />
            </span>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-6 ml-[1.75rem]">
          {ROW2.map((name, i) => (
            <span
              key={name}
              className="exo-fall-icon flex items-center justify-center"
              style={{ animationDelay: `${(i + ROW1.length) * 0.12}s` }}
            >
              <img
                src={BROWSER_ICONS[name]}
                alt={name}
                title={name}
                className="w-12 h-12 object-contain opacity-90"
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const FRAMEWORK_ICONS: Record<string, string> = {
  React: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
  Preact: "https://cdn.simpleicons.org/preact/673AB8",
  Vue: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg",
  Svelte: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/svelte/svelte-original.svg",
  Solid:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1.08em' height='1em' viewBox='256 239 256 239'%3E%3Cdefs%3E%3ClinearGradient id='SVGWXvcOcqs' x1='27.5' x2='152' y1='3' y2='63.5' gradientTransform='translate(249.56 233.12)scale(1.61006)' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='.1' stop-color='%2376b3e1'/%3E%3Cstop offset='.3' stop-color='%23dcf2fd'/%3E%3Cstop offset='1' stop-color='%2376b3e1'/%3E%3C/linearGradient%3E%3ClinearGradient id='SVGtXBLjbrF' x1='95.8' x2='74' y1='32.6' y2='105.2' gradientTransform='translate(249.56 233.12)scale(1.61006)' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2376b3e1'/%3E%3Cstop offset='.5' stop-color='%234377bb'/%3E%3Cstop offset='1' stop-color='%231f3b77'/%3E%3C/linearGradient%3E%3ClinearGradient id='SVG44i0wdWH' x1='18.4' x2='144.3' y1='64.2' y2='149.8' gradientTransform='translate(249.56 233.12)scale(1.61006)' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23315aa9'/%3E%3Cstop offset='.5' stop-color='%23518ac8'/%3E%3Cstop offset='1' stop-color='%23315aa9'/%3E%3C/linearGradient%3E%3ClinearGradient id='SVGxEBrkbOG' x1='75.2' x2='24.4' y1='74.5' y2='260.8' gradientTransform='translate(249.56 233.12)scale(1.61006)' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%234377bb'/%3E%3Cstop offset='.5' stop-color='%231a336b'/%3E%3Cstop offset='1' stop-color='%231a336b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='%2376b3e1' d='M512 289.472s-85.333-62.791-151.347-48.301l-4.829 1.61c-9.66 3.221-17.711 8.05-22.542 14.491l-3.219 4.829l-24.152 41.862l41.863 8.051c17.71 11.27 40.251 16.101 61.182 11.27l74.063 14.491z'/%3E%3Cpath fill='url(%23SVGWXvcOcqs)' d='M512 289.472s-85.333-62.791-151.347-48.301l-4.829 1.61c-9.66 3.221-17.711 8.05-22.542 14.491l-3.219 4.829l-24.152 41.862l41.863 8.051c17.71 11.27 40.251 16.101 61.182 11.27l74.063 14.491z' opacity='.3'/%3E%3Cpath fill='%23518ac8' d='m333.282 289.472l-6.439 1.611c-27.371 8.05-35.421 33.811-20.932 56.352c16.101 20.931 49.913 32.201 77.284 24.151l99.824-33.811s-85.334-62.792-149.737-48.303'/%3E%3Cpath fill='url(%23SVGtXBLjbrF)' d='m333.282 289.472l-6.439 1.611c-27.371 8.05-35.421 33.811-20.932 56.352c16.101 20.931 49.913 32.201 77.284 24.151l99.824-33.811s-85.334-62.792-149.737-48.303' opacity='.3'/%3E%3Cpath fill='url(%23SVG44i0wdWH)' d='M465.308 361.925c-18.439-23.036-49.008-32.588-77.283-24.15l-99.823 32.201L256 426.328l180.327 30.592l32.201-57.963c6.441-11.271 4.831-24.15-3.22-37.032'/%3E%3Cpath fill='url(%23SVGxEBrkbOG)' d='M433.106 418.277c-18.439-23.036-49.006-32.588-77.282-24.15L256 426.328s85.333 64.402 151.346 48.303l4.83-1.612c27.371-8.049 37.031-33.81 20.93-54.742'/%3E%3C/svg%3E",
};

const FRAMEWORK_NAMES = ["Vue", "React", "Preact", "Svelte", "Solid"];

const LANG_ICONS: Record<string, string> = {
  TypeScript: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
  JavaScript: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
};
const LANG_NAMES = ["TypeScript", "JavaScript"];

export function FeatureFrameworks() {
  return (
    <div className="w-full min-h-24 flex flex-col items-center justify-center gap-4 p-3 pt-6">
      <div className="flex flex-row items-end justify-center gap-4">
        {FRAMEWORK_NAMES.map((name, i) => (
          <span
            key={name}
            title={name}
            className={i % 2 === 0 ? "translate-y-[-0.5rem]" : "translate-y-[0.5rem]"}
          >
            <img
              src={FRAMEWORK_ICONS[name]}
              alt={name}
              className="w-12 h-12 object-contain opacity-90"
            />
          </span>
        ))}
      </div>
      <div className="flex flex-row items-center justify-center gap-4">
        {LANG_NAMES.map((name) => (
          <span key={name} title={name}>
            <img
              src={LANG_ICONS[name]}
              alt={name}
              className="w-12 h-12 object-contain opacity-90"
            />
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeatureContentUi() {
  return (
    <div className="w-full h-full flex flex-col rounded-md overflow-hidden border border-[var(--exo-home-border)]">
      <div className="flex items-center gap-1 py-1 px-1.5 border-b border-[var(--exo-home-border)] shrink-0">
        <span className="w-1 h-1 rounded-full bg-[#ff5f56]" />
        <span className="w-1 h-1 rounded-full bg-[#ffbd2e]" />
        <span className="w-1 h-1 rounded-full bg-[#27c93f]" />
        <span className="text-[0.55rem] text-[var(--exo-home-muted)] font-mono ml-0.5 truncate flex-1">https://example.com/article</span>
      </div>
      <div className="relative flex-1 min-h-0 p-2 bg-[var(--exo-home-bg, #fff)]">
        {/* Skeleton: mix of blocks and lines */}
        <div className="space-y-2" aria-hidden>
          <div className="h-6 w-[85%] rounded bg-[var(--exo-home-muted)]/25" />
          <div className="flex gap-2">
            <div className="h-8 w-16 rounded bg-[var(--exo-home-muted)]/20 shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="h-2 w-full rounded bg-[var(--exo-home-muted)]/20" />
              <div className="h-2 w-[90%] rounded bg-[var(--exo-home-muted)]/20" />
            </div>
          </div>
          <div className="h-5 w-full rounded bg-[var(--exo-home-muted)]/20" />
          <div className="h-5 w-[70%] rounded bg-[var(--exo-home-muted)]/20" />
        </div>
        {/* Translation panel: orange+gray gradient; pointer has spacing from panel */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] rounded border border-[var(--exo-home-border)] shadow-md overflow-visible cursor-pointer"
          style={{ background: "var(--exo-orange-panel-gradient)" }}
        >
          {/* Pointer: triangle + vertical line, 45°, with gap from panel corner */}
          <div className="absolute -left-3 -top-3" style={{ transform: "rotate(-45deg)" }} aria-hidden>
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="var(--exo-home-text)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path fill="var(--exo-home-text)" d="M6 0 L12 7 L6 6 L0 7 Z" />
              <line x1="6" y1="6" x2="6" y2="14" />
            </svg>
          </div>
          <div className="px-1.5 py-1 border-b border-[var(--exo-home-border)] text-[0.6rem] font-medium text-[var(--exo-home-text)]">
            Translate
          </div>
          <div className="p-1 space-y-0.5">
            <div className="text-[0.5rem] text-[var(--exo-home-muted)]">Original</div>
            <div className="text-[0.55rem] text-[var(--exo-home-text)] leading-tight truncate">Selected text...</div>
            <div className="text-[0.5rem] text-[var(--exo-home-muted)] pt-0.5">Translation</div>
            <div className="text-[0.55rem] text-[var(--exo-home-text)] leading-tight">Translated result</div>
          </div>
          <div className="px-1 pb-1 flex gap-0.5 border-t border-[var(--exo-home-border)]">
            <button type="button" className="flex-1 text-[0.5rem] py-0.5 rounded border border-[var(--exo-home-border)] text-[var(--exo-home-text)] cursor-pointer">Copy</button>
            <span className="text-[0.5rem] text-[var(--exo-home-muted)] py-0.5">EN → ZH</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hero-style orange gradient for charts (works in light/dark) */
const CHART_GRADIENT_ID_BAR = "exo-chart-orange-bar";
const CHART_GRADIENT_ID_PIE = "exo-chart-orange-pie";

function BarChartMini() {
  const bars = [
    { w: 12, h: 28, y: 24 },
    { w: 12, h: 18, y: 34 },
    { w: 12, h: 32, y: 20 },
    { w: 12, h: 14, y: 38 },
    { w: 12, h: 22, y: 30 },
  ];
  return (
    <svg viewBox="0 0 80 56" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id={CHART_GRADIENT_ID_BAR} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="var(--exo-chart-gray-start)" />
          <stop offset="0.3" stopColor="var(--exo-chart-gray-mid)" />
          <stop offset="0.6" stopColor="#e6762d" />
          <stop offset="1" stopColor="#e68637" />
        </linearGradient>
      </defs>
      {bars.map((b, i) => (
        <rect
          key={i}
          x={8 + i * 14}
          y={b.y}
          width={b.w}
          height={b.h}
          rx="3"
          ry="3"
          fill="none"
          stroke={`url(#${CHART_GRADIENT_ID_BAR})`}
          strokeWidth="1.2"
        />
      ))}
    </svg>
  );
}

function PieChartMini() {
  const r = 20;
  const cx = 28;
  const cy = 28;
  const segments = [
    { pct: 0.35 },
    { pct: 0.25 },
    { pct: 0.2 },
    { pct: 0.12 },
    { pct: 0.08 },
  ];
  let start = 0;
  const paths = segments.map((s, i) => {
    const angle = s.pct * 360;
    const end = start + angle;
    const x1 = cx + r * Math.cos((start * Math.PI) / 180);
    const y1 = cy + r * Math.sin((start * Math.PI) / 180);
    const x2 = cx + r * Math.cos((end * Math.PI) / 180);
    const y2 = cy + r * Math.sin((end * Math.PI) / 180);
    const large = angle > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    start = end;
    return (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={`url(#${CHART_GRADIENT_ID_PIE})`}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    );
  });
  return (
    <svg viewBox="0 0 56 56" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id={CHART_GRADIENT_ID_PIE} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="var(--exo-chart-gray-start)" />
          <stop offset="0.3" stopColor="var(--exo-chart-gray-mid)" />
          <stop offset="0.6" stopColor="#e6762d" />
          <stop offset="1" stopColor="#e68637" />
        </linearGradient>
      </defs>
      {paths}
    </svg>
  );
}

export function FeatureBundleAnalysis() {
  return (
    <div className="w-full h-full flex items-stretch justify-center gap-2 p-2">
      <div className="flex-1 min-w-0 rounded border border-[var(--exo-home-border)] p-1 flex items-center justify-center bg-transparent">
        <BarChartMini />
      </div>
      <div className="flex-1 min-w-0 rounded border border-[var(--exo-home-border)] p-1 flex items-center justify-center bg-transparent">
        <PieChartMini />
      </div>
    </div>
  );
}

const ZIP_FILE_LABELS = [".json", ".js", ".css", ".html", ".png"];

const ZIP_RECT_W = 58;
const ZIP_RECT_H = 36;
const ZIP_RECT_GAP = 12;
const ZIP_VIEW_W = 320;
const ZIP_VIEW_H = 240;

function zipRectX(index: number) {
  const totalWidth = ZIP_FILE_LABELS.length * ZIP_RECT_W + (ZIP_FILE_LABELS.length - 1) * ZIP_RECT_GAP;
  const startX = (ZIP_VIEW_W - totalWidth) / 2;
  return startX + index * (ZIP_RECT_W + ZIP_RECT_GAP);
}

export function FeatureZip() {
  const rectY = 14;
  const rectCenterY = rectY + ZIP_RECT_H / 2;
  const rectBottomY = rectY + ZIP_RECT_H;
  const zipCenterX = ZIP_VIEW_W / 2;
  const zipTopY = 130;
  const zipIconW = 72;
  const zipIconH = 84;
  const zipLeft = zipCenterX - zipIconW / 2;
  const zipTop = zipTopY;

  const curveControlOffset = 28;

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <svg
        viewBox={`0 0 ${ZIP_VIEW_W} ${ZIP_VIEW_H}`}
        className="w-full h-full max-h-full object-contain"
        fill="none"
        stroke="var(--exo-home-border)"
        strokeWidth="1"
        aria-hidden
      >
        <defs>
          <linearGradient id="exo-zip-line-gradient" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="var(--exo-home-muted)" />
            <stop offset="0.3" stopColor="var(--rp-c-brand, #f97316)" />
            <stop offset="0.7" stopColor="var(--rp-c-brand, #f97316)" />
            <stop offset="1" stopColor="var(--exo-home-muted)" />
          </linearGradient>
        </defs>
        {/* File type rectangles: fill only, no stroke */}
        {ZIP_FILE_LABELS.map((label, i) => (
          <g key={label}>
            <rect
              x={zipRectX(i)}
              y={rectY}
              width={ZIP_RECT_W}
              height={ZIP_RECT_H}
              rx="5"
              ry="5"
              fill="var(--exo-home-block-bg)"
            />
            <text
              x={zipRectX(i) + ZIP_RECT_W / 2}
              y={rectCenterY + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="600"
              fill="var(--exo-home-text)"
              stroke="none"
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          </g>
        ))}
        {/* Zip file icon (larger) */}
        <g transform={`translate(${zipLeft}, ${zipTop}) scale(${zipIconW / 48}, ${zipIconH / 56})`}>
          <path
            d="M8 4h20l12 12v36H8V4z"
            fill="none"
            stroke="var(--exo-home-muted)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M28 4v12h12"
            fill="none"
            stroke="var(--exo-home-muted)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 22h20M14 28h20M14 34h20M14 40h14"
            fill="none"
            stroke="var(--exo-home-muted)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x={24}
            y={52}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="var(--rp-c-brand, #f97316)"
            stroke="none"
            fontFamily="system-ui, sans-serif"
          >
            .zip
          </text>
        </g>
        {/* Curved connecting lines drawn on top so every line is visible (including center .css) */}
        {ZIP_FILE_LABELS.map((_, i) => {
          const cx = zipRectX(i) + ZIP_RECT_W / 2;
          const ctrlX = cx + (zipCenterX - cx) * 0.5;
          const ctrlY = rectBottomY + curveControlOffset;
          const d = `M ${cx} ${rectBottomY} Q ${ctrlX} ${ctrlY} ${zipCenterX} ${zipTopY}`;
          return <path key={i} d={d} className="exo-zip-flow-gradient" />;
        })}
      </svg>
    </div>
  );
}

export function FeatureAiTerminal() {
  const errRed = "text-[#dc2626] dark:text-[#f87171]";
  return (
    <div className="exo-term-glass w-full rounded-md overflow-hidden border border-[var(--exo-term-border)] h-full min-h-0 flex flex-col">
      <TerminalChrome />
      <div className="p-2 pl-3 font-mono text-[0.65rem] leading-relaxed flex-1 min-h-0 overflow-auto">
        <div className={termLine.prompt}>$ extenzo dev --debug</div>
        <div className={`mt-1 ${errRed} flex items-center gap-1 flex-wrap`}>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#f47067] text-black font-semibold"> error </span>
          <span>--- Extenzo extension error ---</span>
        </div>
        <div className={errRed}>extenzo version: 0.1.0-alpha.0</div>
        <div className={errRed}>source: content</div>
        <div className={errRed}>type: error</div>
        <div className={errRed}>time: 2026/3/12 01:19:47</div>
        <div className={errRed}>message: fff is not defined</div>
        <div className={`${errRed} break-all`}>location: chrome-extension://gbbmamkebbdmmialebiihogjhgcgkhlm/content/index.js:1677:39</div>
        <div className={`mt-0.5 ${errRed}`}>stack:</div>
        <div className={errRed}>ReferenceError: fff is not defined</div>
        <div className={`${errRed} pl-3`}>at chrome-extension://gbbmamkebbdmmialebiihogjhgcgkhlm/content/index.js:1677:39</div>
        <div className={`mt-0.5 ${errRed}`}>---------------------------</div>
      </div>
    </div>
  );
}
