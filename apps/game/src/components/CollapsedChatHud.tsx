import type { ChatMessage } from "@island/shared";

type CollapsedChatHudProps = {
  messages: ChatMessage[];
  currentUserId?: string;
  currentAvatarId?: string;
  unreadCount?: number;
  onOpen: () => void;
};

export function CollapsedChatHud({
  messages,
  currentUserId,
  currentAvatarId,
  unreadCount,
  onOpen,
}: CollapsedChatHudProps) {
  const previewMessages = messages.slice(-3);

  return (
    <div className="collapsed-chat" aria-label="Tin nhắn gần đây">
      <button
        className="collapsed-chat__badge"
        type="button"
        aria-label="Mở Quảng Trường"
        onClick={(e) => {
          console.log("[CollapsedChatHud] Badge clicked -> opening chat");
          onOpen();
        }}
      >
        <span className="collapsed-chat__badge-ring">
          <img src="/assets/icons/menu/icon_chat.png" alt="" />
        </span>
      </button>

      <button
        className="collapsed-chat__feed"
        type="button"
        aria-label="Mở Quảng Trường"
        onClick={(e) => {
          console.log("[CollapsedChatHud] Chat feed clicked -> opening chat");
          onOpen();
        }}
      >
        {previewMessages.length > 0 ? (
          previewMessages.map((message) => {
            return (
              <span className="collapsed-chat__row" key={message.id}>
                <strong>
                  {message.kind === "system" ? "Hệ thống" : message.userName}
                </strong>
                <span className="collapsed-chat__message">{message.text}</span>
              </span>
            );
          })
        ) : (
          <span className="collapsed-chat__empty">Chạm để mở Quảng Trường</span>
        )}
      </button>
    </div>
  );
}
