type ExtenzoMonitorOptions = {
  entry: string;
  monitorPath: string;
  autoOpen?: boolean;
  registerShortcut?: boolean;
};

type ErrorPayload = {
  type: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  time: number;
};

const SETUP_KEY = "__EXTENZO_MONITOR_SETUP__";
const OPEN_KEY = "__EXTENZO_MONITOR_OPENED__";
const WRAP_KEY = "__EXTENZO_LISTENER_WRAPPED__";
const RUNTIME_PROXY_SYMBOL = Symbol.for("extenzo.runtime.proxy");
const OPEN_MONITOR_COMMAND = "open-extenzo-monitor";
const MONITOR_READY_TYPE = "monitor-ready";
const MAX_ERROR_BUFFER = 100;

type BufferedError = ErrorPayload & { entry: string };

let monitorWindowId: number | null = null;
const errorBuffer: BufferedError[] = [];

declare const chrome: {
  runtime?: {
    sendMessage?: (msg: unknown) => unknown;
    getURL?: (path: string) => string;
    onMessage?: {
      addListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => void;
    };
  };
  windows?: {
    create?: (opts: { url: string; type: string; width: number; height: number }) => Promise<{ id?: number } | undefined>;
    get?: (id: number) => Promise<{ id: number } | undefined>;
    getAll?: (opts?: { populate?: boolean }) => Promise<Array<{ id?: number; tabs?: Array<{ url?: string }> }>>;
    update?: (id: number, opts: { focused: boolean }) => Promise<void>;
    remove?: (id: number) => Promise<void>;
    onRemoved?: { addListener: (cb: (windowId: number) => void) => void };
  };
  commands?: {
    onCommand?: { addListener: (cb: (command: string) => void) => void };
  };
};

function getGlobalObj(): typeof globalThis {
  return typeof globalThis !== "undefined" ? globalThis : ({} as typeof globalThis);
}

function normalizeError(value: unknown): { message: string; stack: string } {
  if (!value) return { message: "Unknown error", stack: "" };
  if (typeof value === "string") return { message: value, stack: "" };
  if (typeof value === "object") {
    const obj = value as { message?: unknown; stack?: unknown };
    const message = obj.message != null ? String(obj.message) : String(value);
    const stack = obj.stack != null ? String(obj.stack) : "";
    return { message: message || "Error", stack };
  }
  return { message: String(value), stack: "" };
}

function pushErrorBuffer(entry: string, payload: ErrorPayload): void {
  errorBuffer.push({ entry, ...payload });
  if (errorBuffer.length > MAX_ERROR_BUFFER) errorBuffer.splice(0, errorBuffer.length - MAX_ERROR_BUFFER);
}

function clearErrorBuffer(): void {
  errorBuffer.length = 0;
}

function safeSendMessage(entry: string, payload: ErrorPayload): void {
  pushErrorBuffer(entry, payload);
  try {
    const runtime = typeof chrome !== "undefined" ? chrome.runtime : undefined;
    if (!runtime || typeof runtime.sendMessage !== "function") return;
    const msg = { __EXTENZO_DEBUG__: true, entry, ...payload };
    const result = runtime.sendMessage(msg);
    const maybeCatch = result as { catch?: (cb: () => void) => void } | undefined;
    if (maybeCatch?.catch) maybeCatch.catch(() => {});
  } catch {}
}

function sendListenerError(entry: string, err: unknown): void {
  const normalized = normalizeError(err);
  safeSendMessage(entry, {
    type: "error",
    message: normalized.message,
    stack: normalized.stack,
    time: Date.now(),
  });
}

function buildErrorPayload(event: { error?: unknown; message?: unknown; filename?: unknown; lineno?: unknown; colno?: unknown }): ErrorPayload {
  const err = normalizeError(event.error ?? event.message);
  return {
    type: "error",
    message: err.message,
    stack: err.stack,
    filename: event.filename ? String(event.filename) : "",
    lineno: event.lineno ? Number(event.lineno) : 0,
    colno: event.colno ? Number(event.colno) : 0,
    time: Date.now(),
  };
}

function buildRejectionPayload(event: { reason?: unknown }): ErrorPayload {
  const err = normalizeError(event.reason);
  return {
    type: "unhandledrejection",
    message: err.message,
    stack: err.stack,
    time: Date.now(),
  };
}

function attachListeners(entry: string, target: typeof globalThis): void {
  const addListener = (target as { addEventListener?: (type: string, cb: (event: unknown) => void) => void }).addEventListener;
  if (!addListener) return;
  addListener("error", (event) => {
    safeSendMessage(entry, buildErrorPayload(event as { error?: unknown; message?: unknown; filename?: unknown; lineno?: unknown; colno?: unknown }));
  });
  addListener("unhandledrejection", (event) => {
    safeSendMessage(entry, buildRejectionPayload(event as { reason?: unknown }));
  });
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isListenerTarget(value: unknown): value is { addListener: (...args: unknown[]) => void } & Record<string, unknown> {
  return isObjectLike(value) && typeof (value as { addListener?: unknown }).addListener === "function";
}

function wrapChromeListenerTarget(entry: string, target: { addListener: (...args: unknown[]) => void } & Record<string, unknown>): void {
  if (target[WRAP_KEY]) return;
  target[WRAP_KEY] = true;
  const original = target.addListener;
  target.addListener = function (...args: unknown[]) {
    const cb = args[0];
    if (typeof cb !== "function") return original.apply(this, args as []);
    const wrapped = function (this: unknown, ...cbArgs: unknown[]) {
      try {
        return (cb as (...a: unknown[]) => unknown).apply(this, cbArgs);
      } catch (err) {
        sendListenerError(entry, err);
        throw err;
      }
    };
    const nextArgs = [wrapped, ...args.slice(1)];
    return original.apply(this, nextArgs as []);
  };
}

type ChromeEventTarget = { addListener: (...args: unknown[]) => void } & Record<string, unknown>;

function isChromeEventTarget(value: unknown): value is ChromeEventTarget {
  return isObjectLike(value) && typeof (value as ChromeEventTarget).addListener === "function";
}

function createChromeEventProxy(entry: string, target: ChromeEventTarget): ChromeEventTarget {
  const originalAddListener = target.addListener.bind(target);
  return new Proxy(target, {
    get(orig: ChromeEventTarget, prop: string) {
      if (prop === "addListener") {
        return function addListener(callback: (...args: unknown[]) => unknown): void {
          const wrapped = function (this: unknown, ...args: unknown[]): unknown {
            const first = args[0];
            if (first && typeof first === "object" && (first as Record<string, unknown>).__EXTENZO_DEBUG__ === true) {
              return false;
            }
            try {
              return (callback as (...a: unknown[]) => unknown).apply(this, args);
            } catch (err) {
              sendListenerError(entry, err);
              throw err;
            }
          };
          originalAddListener(wrapped);
        };
      }
      const value = orig[prop];
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(orig) : value;
    },
  }) as ChromeEventTarget;
}

function createRuntimeProxy(entry: string, runtime: Record<string, unknown>): Record<string, unknown> {
  return new Proxy(runtime, {
    get(orig: Record<string, unknown>, prop: string | symbol) {
      if (prop === RUNTIME_PROXY_SYMBOL) return true;
      const value = orig[prop as string];
      if (isChromeEventTarget(value)) return createChromeEventProxy(entry, value);
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(orig) : value;
    },
  });
}

function isMonitorReadyMessage(msg: unknown): boolean {
  if (!msg || typeof msg !== "object") return false;
  const o = msg as Record<string, unknown>;
  return o.__EXTENZO_DEBUG__ === true && o.type === MONITOR_READY_TYPE;
}

function registerMonitorReadyHandler(runtime: Record<string, unknown>): void {
  const onMessage = runtime.onMessage as { addListener: (cb: (msg: unknown, sender: unknown, sendResponse: (r?: unknown) => void) => boolean | void) => void } | undefined;
  if (!onMessage?.addListener) return;
  onMessage.addListener((msg: unknown, _sender: unknown, sendResponse: (r?: unknown) => void) => {
    if (!isMonitorReadyMessage(msg)) return false;
    const copy = errorBuffer.slice();
    try {
      sendResponse({ buffered: copy });
    } catch {}
    clearErrorBuffer();
    return true;
  });
}

function patchRuntimeWithProxy(entry: string): void {
  const root = typeof chrome !== "undefined" ? (chrome as Record<string, unknown>) : undefined;
  if (!root || !root.runtime || typeof root.runtime !== "object") return;
  const current = root.runtime as Record<string, unknown> & { [RUNTIME_PROXY_SYMBOL]?: boolean };
  if (current[RUNTIME_PROXY_SYMBOL]) return;
  const runtime = current;
  registerMonitorReadyHandler(runtime);
  const proxy = createRuntimeProxy(entry, runtime);
  try {
    Object.defineProperty(root, "runtime", {
      value: proxy,
      configurable: true,
      enumerable: true,
      writable: false,
    });
  } catch {}
}

function wrapChromeListeners(entry: string): void {
  const root = typeof chrome !== "undefined" ? chrome : undefined;
  if (!isObjectLike(root)) return;
  const rootRecord = root as Record<string, unknown>;
  for (const key of Object.keys(rootRecord)) {
    if (key === "runtime") continue;
    const ns = rootRecord[key];
    if (isListenerTarget(ns)) wrapChromeListenerTarget(entry, ns);
    if (!isObjectLike(ns)) continue;
    for (const subKey of Object.keys(ns as Record<string, unknown>)) {
      const sub = (ns as Record<string, unknown>)[subKey];
      if (isListenerTarget(sub)) wrapChromeListenerTarget(entry, sub);
    }
  }
}

function openMonitorWindow(monitorPath: string, target: typeof globalThis): void {
  try {
    const runtime = typeof chrome !== "undefined" ? chrome.runtime : undefined;
    const windowsApi = typeof chrome !== "undefined" ? chrome.windows : undefined;
    if (!runtime || !windowsApi || typeof windowsApi.create !== "function") return;
    if (typeof runtime.getURL !== "function") return;
    if ((target as Record<string, unknown>)[OPEN_KEY]) return;
    (target as Record<string, unknown>)[OPEN_KEY] = true;
    windowsApi.create({
      url: runtime.getURL(monitorPath),
      type: "popup",
      width: 800,
      height: 600,
    });
  } catch {}
}

function openMonitorWindowIfNotOpen(monitorPath: string): void {
  const runtime = typeof chrome !== "undefined" ? chrome.runtime : undefined;
  const windowsApi = typeof chrome !== "undefined" ? chrome.windows : undefined;
  if (!runtime?.getURL || !windowsApi?.create) return;
  const url = runtime.getURL(monitorPath);

  function doCreate(): void {
    try {
      const result = windowsApi!.create!({
        url,
        type: "popup",
        width: 800,
        height: 600,
      });
      const p = result && typeof (result as Promise<{ id?: number } | undefined>)?.then === "function"
        ? (result as Promise<{ id?: number } | undefined>)
        : Promise.resolve(result as { id?: number } | undefined);
      p.then((w) => {
        if (w?.id != null) monitorWindowId = w.id;
      }).catch(() => {});
    } catch {}
  }

  if (monitorWindowId != null && windowsApi.get) {
    windowsApi
      .get(monitorWindowId)
      .then((w) => {
        if (w?.id != null && windowsApi?.update) {
          windowsApi.update(w.id, { focused: true });
          return;
        }
        doCreate();
      })
      .catch(() => {
        monitorWindowId = null;
        doCreate();
      });
    return;
  }
  doCreate();
}

function closeStaleMonitorWindows(monitorPath: string): void {
  const runtime = typeof chrome !== "undefined" ? chrome.runtime : undefined;
  const windowsApi = typeof chrome !== "undefined" ? chrome.windows : undefined;
  if (!runtime?.getURL || !windowsApi?.getAll || !windowsApi?.remove) return;
  const monitorUrl = runtime.getURL(monitorPath);
  const removeFn = windowsApi.remove;
  const p = windowsApi.getAll({ populate: true });
  const then = (p as Promise<Array<{ id?: number; tabs?: Array<{ url?: string }> }>>)?.then;
  if (typeof then !== "function" || !removeFn) return;
  then.call(p, (windows: Array<{ id?: number; tabs?: Array<{ url?: string }> }>) => {
    for (const w of windows) {
      if (w.id == null) continue;
      const tabs = w.tabs;
      if (!Array.isArray(tabs)) continue;
      for (const tab of tabs) {
        if (tab.url === monitorUrl) {
          removeFn(w.id).catch(() => {});
          break;
        }
      }
    }
  }).catch(() => {});
}

function registerCommandsListener(monitorPath: string): void {
  closeStaleMonitorWindows(monitorPath);
  const commandsApi = typeof chrome !== "undefined" ? chrome.commands : undefined;
  const windowsApi = typeof chrome !== "undefined" ? chrome.windows : undefined;
  if (!commandsApi?.onCommand?.addListener) return;
  commandsApi.onCommand.addListener((command: string) => {
    if (command === OPEN_MONITOR_COMMAND) openMonitorWindowIfNotOpen(monitorPath);
  });
  if (windowsApi?.onRemoved?.addListener) {
    windowsApi.onRemoved.addListener((windowId: number) => {
      if (windowId === monitorWindowId) monitorWindowId = null;
    });
  }
}

function markSetup(entry: string, target: typeof globalThis): boolean {
  const store = (target as Record<string, unknown>)[SETUP_KEY];
  if (store && store instanceof Set) {
    if (store.has(entry)) return false;
    store.add(entry);
    return true;
  }
  const next = new Set<string>([entry]);
  (target as Record<string, unknown>)[SETUP_KEY] = next;
  return true;
}

export function setupExtenzoMonitor(options: ExtenzoMonitorOptions): void {
  if (!options || !options.entry || !options.monitorPath) return;
  const target = getGlobalObj();
  if (!markSetup(options.entry, target)) return;
  attachListeners(options.entry, target);
  patchRuntimeWithProxy(options.entry);
  wrapChromeListeners(options.entry);
  if (options.autoOpen) openMonitorWindow(options.monitorPath, target);
  if (options.registerShortcut) registerCommandsListener(options.monitorPath);
}
