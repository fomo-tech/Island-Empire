import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@island/shared";
import { CollapsedChatHud } from "./CollapsedChatHud";

type ChatTab = "user" | "system";

type ChatPanelProps = {
  messages: ChatMessage[];
  currentUserId?: string;
  currentAvatarId?: string;
  currentVipLevel?: number;
  online: boolean;
  onSend: (text: string) => boolean;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeAvatarId(value?: string) {
  return value && /^[a-z0-9_-]+$/i.test(value) ? value : "emperor";
}

function safeVipLevel(value?: number) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function ChatPanel({
  messages,
  currentUserId,
  currentAvatarId,
  currentVipLevel,
  online,
  onSend,
}: ChatPanelProps) {
  const [tab, setTab] = useState<ChatTab>("user");
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(
        "(max-width: 760px), (max-height: 599px) and (pointer: coarse), (min-width: 768px) and (max-width: 1199px), (min-width: 768px) and (orientation: landscape), (pointer: coarse) and (min-width: 768px)",
      ).matches,
  );
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState({ user: 0, system: 0 });
  const [pendingBelow, setPendingBelow] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const previousIdsRef = useRef(new Set<string>());
  const nearBottomRef = useRef(true);

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.kind === tab).slice(-100),
    [messages, tab],
  );

  useEffect(() => {
    const previous = previousIdsRef.current;
    const fresh = messages.filter((message) => !previous.has(message.id));
    previousIdsRef.current = new Set(messages.map((message) => message.id));
    if (fresh.length === 0) return;
    setUnread((current) => {
      const next = { ...current };
      fresh.forEach((message) => {
        if (collapsed || message.kind !== tab) next[message.kind] += 1;
      });
      return next;
    });
    const visibleFresh = fresh.filter((message) => message.kind === tab).length;
    if (visibleFresh > 0 && !collapsed) {
      if (nearBottomRef.current) {
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        });
      } else {
        setPendingBelow((count) => count + visibleFresh);
      }
    }
  }, [messages, tab, collapsed]);

  useEffect(() => {
    setUnread((current) => ({ ...current, [tab]: 0 }));
    setPendingBelow(0);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      nearBottomRef.current = true;
    });
  }, [tab, collapsed]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || !online || tab !== "user") return;
    if (onSend(text)) setInput("");
  };

  const scrollToLatest = () => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
    nearBottomRef.current = true;
    setPendingBelow(0);
  };

  return (
    <section
      className={`strategy-chat hud-interactive ${collapsed ? "is-collapsed" : ""}`}
    >
      {!collapsed && (
        <button
          className="strategy-chat__header"
          type="button"
          aria-expanded="true"
          onClick={() => setCollapsed(true)}
        >
          <img src="/assets/icons/icon_chat_users_european.png" alt="" />
          <span>
            <strong>QUẢNG TRƯỜNG</strong>
            <small className={online ? "is-online" : "is-offline"}>
              <i /> {online ? "Realtime" : "Đang kết nối lại"}
            </small>
          </span>
          <b>−</b>
        </button>
      )}

      {collapsed && (
        <CollapsedChatHud
          messages={messages}
          currentUserId={currentUserId}
          currentAvatarId={currentAvatarId}
          onOpen={() => setCollapsed(false)}
        />
      )}

      {!collapsed && (
        <>
          <nav className="strategy-chat__tabs" aria-label="Kênh trò chuyện">
            <button
              className={tab === "user" ? "active" : ""}
              type="button"
              onClick={() => setTab("user")}
            >
              <img src="/assets/icons/icon_chat_users_european.png" alt="" />{" "}
              Người chơi
              {unread.user > 0 && <em>{unread.user}</em>}
            </button>
            <button
              className={tab === "system" ? "active" : ""}
              type="button"
              onClick={() => setTab("system")}
            >
              <img src="/assets/icons/icon_chat_system_european.png" alt="" />{" "}
              Hệ thống
              {unread.system > 0 && <em>{unread.system}</em>}
            </button>
          </nav>

          <div
            className="strategy-chat__messages"
            ref={listRef}
            onScroll={(event) => {
              const node = event.currentTarget;
              nearBottomRef.current =
                node.scrollHeight - node.scrollTop - node.clientHeight < 32;
              if (nearBottomRef.current) setPendingBelow(0);
            }}
          >
            {visibleMessages.length === 0 && (
              <div className="strategy-chat__empty">
                {tab === "user"
                  ? "Chưa có quân vương nào lên tiếng."
                  : "Chưa có thông báo hệ thống."}
              </div>
            )}
            {visibleMessages.map((message) => {
              const isMine =
                message.kind === "user" && message.userId === currentUserId;
              const avatarId = safeAvatarId(
                message.kind === "user" && !message.avatarId && isMine
                  ? currentAvatarId
                  : message.kind === "user"
                    ? message.avatarId
                    : undefined,
              );
              const messageVipLevel = safeVipLevel(
                message.kind === "user" &&
                  message.vipLevel === undefined &&
                  isMine
                  ? currentVipLevel
                  : message.kind === "user"
                    ? message.vipLevel
                    : undefined,
              );

              return (
                <article
                  key={message.id}
                  className={`strategy-chat__message strategy-chat__message--${message.kind} ${
                    isMine ? "is-mine" : ""
                  } ${message.kind === "system" ? `level-${message.level}` : ""}`}
                >
                  <div className="strategy-chat__message-identity">
                    {message.kind === "user" ? (
                      <span className="strategy-chat__avatar">
                        <img
                          className="strategy-chat__avatar-portrait"
                          src={`/assets/avatars/${avatarId}.png`}
                          alt={`Đại diện của ${message.userName}`}
                          onError={(event) => {
                            event.currentTarget.src =
                              "/assets/avatars/emperor.png";
                          }}
                        />
                        <img
                          className="strategy-chat__avatar-frame"
                          src="/assets/ui/vip-avatar-frame.webp"
                          alt=""
                        />
                        <span
                          className="strategy-chat__vip-badge"
                          title={`VIP ${messageVipLevel}`}
                        >
                          <img
                            src="/assets/ui/profile-vip-shield.webp"
                            alt=""
                          />
                          <b>{messageVipLevel}</b>
                        </span>
                      </span>
                    ) : (
                      <span className="strategy-chat__system-avatar">
                        <img
                          src="/assets/icons/icon_chat_system_european.png"
                          alt=""
                        />
                      </span>
                    )}
                  </div>
                  <div className="strategy-chat__message-body">
                    <div className="strategy-chat__message-meta">
                      <strong>
                        {message.kind === "user"
                          ? message.userName
                          : "Hệ thống"}
                      </strong>
                      {message.kind === "user" && (
                        <span>VIP {messageVipLevel}</span>
                      )}
                      <time>{formatTime(message.sentAt)}</time>
                    </div>
                    <p>{message.text}</p>
                  </div>
                </article>
              );
            })}
          </div>

          {pendingBelow > 0 && (
            <button
              className="strategy-chat__new"
              type="button"
              onClick={scrollToLatest}
            >
              ↓ {pendingBelow} tin mới
            </button>
          )}

          {tab === "user" ? (
            <form className="strategy-chat__composer" onSubmit={submit}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  online
                    ? "Truyền lệnh đến mọi người chơi..."
                    : "Đang kết nối lại..."
                }
                maxLength={200}
                disabled={!online}
              />
              <span>{input.length}/200</span>
              <button
                type="submit"
                disabled={!online || !input.trim()}
                title="Gửi tin"
              >
                <img
                  src="/assets/icons/icon_chat_send_european.png"
                  alt="Gửi"
                />
              </button>
            </form>
          ) : (
            <div className="strategy-chat__readonly">
              Kênh thông báo chính thức · Chỉ đọc
            </div>
          )}
        </>
      )}
    </section>
  );
}
