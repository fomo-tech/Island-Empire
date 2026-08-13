import type { ChatMessage } from "@island/shared";
import { detectDeviceLanguage, translate } from "../game/i18n";

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
  const language = detectDeviceLanguage();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const previewMessages = messages.slice(-3);

  return (
    <div className="collapsed-chat" aria-label={t("recentMessages")}>
      <button
        className="collapsed-chat__badge"
        type="button"
        aria-label={t("openSquare")}
        onClick={(e) => {
          console.log("[CollapsedChatHud] Badge clicked -> opening chat");
          onOpen();
        }}
      >
        <span className="collapsed-chat__badge-ring">
          <img src="/assets/icons/menu/icon_chat.png" alt="" />
        </span>
        {unreadCount && unreadCount > 0 ? (
          <b className="collapsed-chat__unread">
            {Math.min(99, unreadCount)}
          </b>
        ) : null}
      </button>

      <button
        className="collapsed-chat__feed"
        type="button"
        aria-label={t("openSquare")}
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
                  {message.kind === "system" ? t("system") : message.userName}
                </strong>
                <span className="collapsed-chat__message">{message.text}</span>
              </span>
            );
          })
        ) : (
          <span className="collapsed-chat__empty">{t("tapToOpenSquare")}</span>
        )}
      </button>
    </div>
  );
}
