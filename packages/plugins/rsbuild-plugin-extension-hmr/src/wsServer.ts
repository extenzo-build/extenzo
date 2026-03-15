import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { logDone, logDoneTimed, writeExtensionErrorBlock, getExtenzoVersion } from "@extenzo/core";
import type { ReloadKind } from "./reloadScope";

let wsServer: WebSocketServer | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;

export type ExtensionErrorPayload = {
  entry?: string;
  type?: string;
  message?: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  time?: number;
};

export function buildExtensionErrorLines(payload: ExtensionErrorPayload): string[] {
  const entry = typeof payload.entry === "string" && payload.entry.trim() ? payload.entry.trim() : "unknown";
  const errorType = typeof payload.type === "string" && payload.type.trim() ? payload.type.trim() : "error";
  const timeStr =
    payload.time != null && Number.isFinite(Number(payload.time))
      ? new Date(Number(payload.time)).toLocaleString()
      : new Date().toLocaleString();
  const message = payload.message != null ? String(payload.message) : "Unknown error";
  const stack = payload.stack && String(payload.stack).trim() ? String(payload.stack).trim() : "";
  const filename = payload.filename ? String(payload.filename) : "";
  const lineno = payload.lineno != null && Number.isFinite(Number(payload.lineno)) ? Number(payload.lineno) : undefined;
  const colno = payload.colno != null && Number.isFinite(Number(payload.colno)) ? Number(payload.colno) : undefined;
  const loc = filename ? (filename + (lineno != null ? `:${lineno}` : "") + (colno != null ? `:${colno}` : "")) : "";
  const extenzoVersion = getExtenzoVersion();
  const lines: string[] = [
    "--- Extenzo extension error ---",
    `extenzo version: ${extenzoVersion}`,
    `source: ${entry}`,
    `type: ${errorType}`,
    `time: ${timeStr}`,
    `message: ${message}`,
  ];
  if (loc) lines.push(`location: ${loc}`);
  if (stack) lines.push("stack:", ...stack.split("\n"));
  lines.push("---------------------------");
  return lines;
}

function logExtensionErrorToTerminal(payload: ExtensionErrorPayload): void {
  writeExtensionErrorBlock(buildExtensionErrorLines(payload));
}

function handleHttpRequest(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse
): void {
  if (req.method === "POST" && req.url === "/extenzo-error") {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body) as ExtensionErrorPayload;
        if (payload && (payload.entry != null || payload.message != null)) {
          logExtensionErrorToTerminal(payload);
        }
      } catch { /* ignore */ }
      res.writeHead(204).end();
    });
    return;
  }
  res.writeHead(404).end();
}

export function startWebSocketServer(port: number, startTime?: number): WebSocketServer {
  if (wsServer) return wsServer;
  const t0 = startTime ?? performance.now();
  httpServer = createServer(handleHttpRequest);
  wsServer = new WebSocketServer({ server: httpServer });
  wsServer.on("connection", (ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) ws.send("connected");
  });
  httpServer.listen(port, () => {
    const ms = Math.round(performance.now() - t0);
    logDoneTimed("Hot reload WebSocket: ws://localhost:" + port, ms);
  });
  return wsServer;
}

export type { ReloadKind } from "./reloadScope";

export function notifyReload(kind: ReloadKind): void {
  if (!wsServer) return;
  wsServer.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) client.send(kind);
  });
  logDone("hotreload success", kind, new Date().toLocaleString());
}

export function closeWebSocketServer(): void {
  if (wsServer) {
    wsServer.close();
    wsServer = null;
  }
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
}
