import React from "react";
import { TerminalChrome } from "./TerminalChrome";
import { termLine, termTable } from "./terminalStyles";

export const HERO_TERMINAL_LINE_COUNT = 10;
const LINE_INTERVAL_MS = 240;
const PAUSE_BEFORE_BROWSER_MS = 500;
const BROWSER_VISIBLE_MS = 2600;
const PAUSE_AFTER_BROWSER_MS = 1000;

function HeroTerminalBody({
  visibleCount,
  bodyRef,
}: {
  visibleCount: number;
  bodyRef: React.RefObject<HTMLDivElement | null>;
}) {
  const row = (index: number, content: React.ReactNode, isTableRow = false) => {
    const visible = index < visibleCount;
    return (
      <div
        key={index}
        className={`block transition-all duration-200 ease-out ${
          visible ? "opacity-100 " + (isTableRow ? "max-h-[14em]" : "max-h-[4em]") : "opacity-0 max-h-0 overflow-hidden"
        }`}
      >
        {content}
      </div>
    );
  };
  return (
    <div className="p-4 pl-5 font-mono text-[0.8125rem] leading-[1.7] whitespace-pre-wrap break-all" ref={bodyRef}>
      {row(0, <span className={termLine.prompt}>$ extenzo dev</span>)}
      {row(1, (
        <>
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.value}>Extenzo 0.0.1 with </span>
          <span className={termLine.purple}>Rsbuild 0.4.x</span>
        </>
      ))}
      {row(2, (
        <>
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Parse exo.config </span>
          <span className={termLine.time}>12ms</span>
        </>
      ))}
      {row(3, (
        <>
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Parse manifest </span>
          <span className={termLine.time}>5ms</span>
        </>
      ))}
      {row(4, (
        <>
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Parse entries </span>
          <span className={termLine.time}>8ms</span>
        </>
      ))}
      {row(5, (
        <table className={termTable}>
          <thead>
            <tr>
              <th>Entry</th>
              <th>File</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>background</td><td>app/background.ts</td></tr>
            <tr><td>content</td><td>app/content/index.ts</td></tr>
            <tr><td>popup</td><td>app/popup/index.tsx</td></tr>
          </tbody>
        </table>
      ), true)}
      {row(6, (
        <>
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Pipeline ready </span>
          <span className={termLine.time}>120ms</span>
        </>
      ))}
      {row(7, (
        <>
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Create Rsbuild </span>
          <span className={termLine.time}>16ms</span>
        </>
      ))}
      {row(8, (
        <>
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Dev server http://localhost:3000 </span>
          <span className={termLine.time}>2ms</span>
        </>
      ))}
      {row(9, (
        <>
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Extension size: </span>
          <span className={termLine.cyan}>1.24 MB</span>
        </>
      ))}
    </div>
  );
}

function BrowserWindow({ show }: { show: boolean }) {
  return (
    <div
      className={`absolute left-0 top-full w-[500px] h-[340px] rounded-xl overflow-hidden flex flex-col bg-[var(--exo-home-block-bg)] shadow-[0_16px_48px_rgba(0,0,0,0.22),0_0_0_1px_var(--exo-home-border)] dark:shadow-[0_20px_56px_rgba(0,0,0,0.5),0_0_0_1px_var(--exo-home-border)] pointer-events-none z-10 transition-all duration-300 ease-out ${
        show
          ? "opacity-100 scale-100 [transform:translate(-16%,-85%)]"
          : "opacity-0 scale-[0.94] [transform:translate(-16%,calc(-85%+0.5rem))]"
      }`}
    >
      <div className="flex items-center gap-2 py-1.5 px-2.5 bg-[#21262d] border-b border-[#30363d] shrink-0 min-h-9">
        <div className="flex gap-1 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
          <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
          <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex-1 min-w-0 text-[0.7rem] text-[#8b949e] font-mono whitespace-nowrap overflow-hidden text-ellipsis">
          <span className="mr-1">🔒</span>
          chrome-extension://.../welcome.html
        </div>
        <div className="w-7 h-7 flex items-center justify-center rounded-md text-[#8b949e] shrink-0" title="Extension">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2v4h4a2 2 0 0 1 2 2v4h4a2 2 0 0 1-2 2h-4v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h4V2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[#161b22] border border-[var(--exo-term-border)] border-t-0 px-4 py-5">
        <h2 className="text-[1.125rem] font-bold text-white m-0 mb-2 text-center">
          Extenzo + React
        </h2>
        <p className="text-[0.875rem] text-[#8b949e] m-0 text-center">
          Your extension is ready. Happy building!
        </p>
      </div>
    </div>
  );
}

export function HeroTerminalWithAnimation() {
  const [visibleCount, setVisibleCount] = React.useState(0);
  const [showBrowser, setShowBrowser] = React.useState(false);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  function clearAllTimers() {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  React.useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visibleCount]);

  React.useEffect(() => {
    function runLinePhase() {
      setVisibleCount(0);
      setShowBrowser(false);
      let count = 0;
      intervalRef.current = setInterval(() => {
        count += 1;
        setVisibleCount(count);
        if (count >= HERO_TERMINAL_LINE_COUNT) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          const t1 = setTimeout(() => setShowBrowser(true), PAUSE_BEFORE_BROWSER_MS);
          const t2 = setTimeout(() => {
            setShowBrowser(false);
            const t3 = setTimeout(runLinePhase, PAUSE_AFTER_BROWSER_MS);
            timersRef.current.push(t3);
          }, PAUSE_BEFORE_BROWSER_MS + BROWSER_VISIBLE_MS);
          timersRef.current.push(t1, t2);
        }
      }, LINE_INTERVAL_MS);
    }
    runLinePhase();
    return clearAllTimers;
  }, []);

  return (
    <div className="relative flex flex-col items-start w-full">
      <div className="h-[400px] w-full min-w-0 flex flex-col border border-[var(--exo-term-border)] rounded-lg overflow-hidden bg-[var(--exo-term-bg)] shadow-[var(--exo-term-shadow)] transition-opacity duration-300">
        <TerminalChrome />
        <div className="exo-terminal-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <HeroTerminalBody visibleCount={visibleCount} bodyRef={bodyRef} />
        </div>
      </div>
      <BrowserWindow show={showBrowser} />
    </div>
  );
}

export function HeroTerminal() {
  return (
    <div className="border border-[var(--exo-term-border)] rounded-lg overflow-hidden bg-[var(--exo-term-bg)] shadow-[var(--exo-term-shadow)]">
      <TerminalChrome />
      <HeroTerminalBody visibleCount={HERO_TERMINAL_LINE_COUNT} bodyRef={{ current: null }} />
    </div>
  );
}
