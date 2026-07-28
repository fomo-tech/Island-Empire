import type { RealtimeEnvelope, RealtimeEvent } from "@island/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";
const WS_URL = import.meta.env.VITE_WS_URL ?? API_URL.replace(/^http/, "ws");

export function connectGameSocket(token: string, onEvent: (event: RealtimeEvent) => void, onStatus?: (online: boolean) => void) {
  let socket: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let reconnectTimer = 0;

  const connect = () => {
    if (closed) return;
    const url = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
    socket = new WebSocket(url);

    socket.onopen = () => {
      retry = 0;
      onStatus?.(true);
    };

    socket.onmessage = (message) => {
      try {
        const envelope = JSON.parse(message.data) as RealtimeEnvelope;
        envelope.events?.forEach(onEvent);
      } catch (err) {
        console.warn("Bad realtime payload:", err);
      }
    };

    socket.onclose = () => {
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
    socket?.close();
  };
}
