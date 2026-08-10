import type { RealtimeEnvelope, RealtimeEvent } from "@island/shared";

function getApiUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "";
}

const API_URL = getApiUrl();
function getWsBaseUrl() {
  const configured = import.meta.env.VITE_WS_URL?.trim();
  if (configured) return configured.replace(/\/ws\/?$/, "").replace(/\/$/, "");
  if (API_URL) return API_URL.replace(/^http/, "ws").replace(/\/ws\/?$/, "");
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }
  return "ws://127.0.0.1:4001";
}

const WS_BASE_URL = getWsBaseUrl();
let activeSocket: WebSocket | null = null;

export function sendWorldChat(text: string) {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return false;
  activeSocket.send(JSON.stringify({ type: "user_chat", text }));
  return true;
}

export function connectGameSocket(token: string, onEvent: (event: RealtimeEvent) => void, onStatus?: (online: boolean) => void) {
  let socket: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let reconnectTimer = 0;
  let lastSeq = 0;

  const connect = () => {
    if (closed) return;
    const url = `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`;
    socket = new WebSocket(url);

    socket.onopen = () => {
      retry = 0;
      lastSeq = 0;
      activeSocket = socket;
      onStatus?.(true);
    };

    socket.onmessage = (message) => {
      try {
        const envelope = JSON.parse(message.data) as RealtimeEnvelope;
        if (lastSeq > 0 && envelope.seq !== lastSeq + 1) {
          onEvent({ type: "resync_required", reason: "event_gap" });
        }
        lastSeq = envelope.seq;
        envelope.events?.forEach(onEvent);
      } catch (err) {
        console.warn("Bad realtime payload:", err);
      }
    };

    socket.onclose = () => {
      if (activeSocket === socket) activeSocket = null;
      onStatus?.(false);
      if (closed) return;
      const delay = Math.min(10_000, 600 * 2 ** retry) + Math.floor(Math.random() * 300);
      retry += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  connect();

  return () => {
    closed = true;
    onStatus?.(false);
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    if (activeSocket === socket) activeSocket = null;
    socket?.close();
  };
}
