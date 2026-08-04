import type { ChatMessage } from "@island/shared";

type CollapsedChatHudProps = {
  messages: ChatMessage[];
  currentUserId?: string;
  currentAvatarId?: string;
  onOpen: () => void;
};

function safeAvatarId(value?: string) {
  return value && /^[a-z0-9_-]+$/i.test(value) ? value : "emperor";
}

export function CollapsedChatHud({
  messages,
  currentUserId,
  currentAvatarId,
  onOpen,
}: CollapsedChatHudProps) {
  const previewMessages = messages.slice(-3);

  return (
    <div className="collapsed-chat" aria-label="Tin nhắn gần đây">
      <button
        className="collapsed-chat__badge"
        type="button"
        aria-label="Mở Quảng Trường"
        onClick={onOpen}
      >
        <span className="collapsed-chat__badge-ring">
          <img src="/assets/icons/icon_map.png" alt="" />
        </span>
      </button>

      <button
        className="collapsed-chat__feed"
        type="button"
        aria-label="Mở Quảng Trường"
        onClick={onOpen}
      >
        {previewMessages.length > 0 ? (
          previewMessages.map((message) => {
            const isMine =
              message.kind === "user" && message.userId === currentUserId;
            const avatarId = safeAvatarId(
              message.kind === "user"
                ? message.avatarId || (isMine ? currentAvatarId : undefined)
                : undefined,
            );

            return (
              <span className="collapsed-chat__row" key={message.id}>
                <span
                  className={`collapsed-chat__avatar collapsed-chat__avatar--${message.kind} ${isMine ? "is-mine" : ""}`}
                >
                  <img
                    src={
                      message.kind === "user"
                        ? `/assets/avatars/${avatarId}.png`
                        : "/assets/icons/icon_chat_system_european.png"
                    }
                    alt=""
                    onError={(event) => {
                      event.currentTarget.src =
                        message.kind === "user"
                          ? "/assets/avatars/emperor.png"
                          : "/assets/icons/icon_chat_system_european.png";
                    }}
                  />
                </span>
                <strong>
                  {message.kind === "system" ? "Hệ thống" : message.userName}
                </strong>
                <span className="collapsed-chat__message">{message.text}</span>
              </span>
            );
          })
        ) : (
          <span className="collapsed-chat__empty">
            Chạm để mở Quảng Trường
          </span>
        )}
      </button>
    </div>
  );
}
