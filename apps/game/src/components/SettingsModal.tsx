import { useEffect, useState } from "react";
import { ConfirmModal } from "./ConfirmModal";
import { MedievalModal } from "./MedievalModal";

type SettingsTab = "display" | "account" | "controls";

interface SettingsModalProps {
  language: "vi" | "en";
  onSetLanguage: (language: "vi" | "en") => void;
  onLogout?: () => void;
  onClose: () => void;
  playerId?: string | null;
  online: boolean;
}

const TUTORIAL_STORAGE_KEYS = [
  "island_empire_onboarding_pending",
  "island_empire_tutorial_completed",
  "island_empire_hide_tutorial",
  "island_empire_onboarding_claim",
  "island_empire_camera_v1",
  "island_empire_builder_region_id",
];

function SettingsSwitch({
  active,
  label,
  onChange,
}: {
  active: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className={`settings-switch ${active ? "active" : ""}`}
      onClick={onChange}
      aria-label={label}
      aria-pressed={active}
    >
      <span className="settings-switch-thumb" />
    </button>
  );
}

export function SettingsModal({
  language,
  onSetLanguage,
  onLogout,
  onClose,
  playerId,
  online,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("display");
  const [confirmAction, setConfirmAction] = useState<"logout" | "resetTutorial" | null>(null);
  const [hideAssets, setHideAssets] = useState(
    () => localStorage.getItem("island_empire_hide_assets") === "true",
  );
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const toggleAssets = () => {
    const next = !hideAssets;
    const toggle = (window as Window & {
      toggleHideTerritoryAssets?: (forceValue?: boolean) => boolean;
    }).toggleHideTerritoryAssets;
    if (!toggle) return;
    toggle(next);
    setHideAssets(next);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };

  const copyPlayerId = async () => {
    if (!playerId) return;
    await navigator.clipboard.writeText(playerId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <>
      <MedievalModal
        title="CÀI ĐẶT HỆ THỐNG"
        subtitle="Chỉ hiển thị các chức năng đang hoạt động"
        onClose={onClose}
        width="92vw"
        maxWidth="820px"
        className="settings-medieval-modal settings-v2"
      >
        <div className="settings-v2__layout">
          <nav className="settings-v2__nav" aria-label="Nhóm cài đặt">
            <button type="button" className={activeTab === "display" ? "active" : ""} onClick={() => setActiveTab("display")}>
              <img src="/assets/icons/icon_settings_display.png" alt="" />
              <span>HIỂN THỊ</span>
            </button>
            <button type="button" className={activeTab === "account" ? "active" : ""} onClick={() => setActiveTab("account")}>
              <img src="/assets/icons/icon_settings_account.png" alt="" />
              <span>TÀI KHOẢN</span>
            </button>
            <button type="button" className={activeTab === "controls" ? "active" : ""} onClick={() => setActiveTab("controls")}>
              <img src="/assets/icons/icon_settings_info.png" alt="" />
              <span>ĐIỀU KHIỂN</span>
            </button>
          </nav>

          <div className="settings-v2__content">
            {activeTab === "display" && (
              <section className="settings-v2__section">
                <header><h3>HIỂN THỊ BẢN ĐỒ</h3><p>Các thay đổi được áp dụng ngay lập tức.</p></header>
                <div className="settings-v2__row">
                  <span><strong>Ngôn ngữ giao diện</strong><small>Tiếng Việt hoặc English</small></span>
                  <div className="settings-v2__choices">
                    <button type="button" className={language === "vi" ? "active" : ""} onClick={() => onSetLanguage("vi")}>Tiếng Việt</button>
                    <button type="button" className={language === "en" ? "active" : ""} onClick={() => onSetLanguage("en")}>English</button>
                  </div>
                </div>
                <div className="settings-v2__row">
                  <span><strong>Ẩn cây cối và địa vật</strong><small>Giảm chi tiết bản đồ để tăng hiệu năng · phím H</small></span>
                  <SettingsSwitch active={hideAssets} label="Ẩn cây cối và địa vật" onChange={toggleAssets} />
                </div>
                <div className="settings-v2__row">
                  <span><strong>Toàn màn hình</strong><small>Có thể bật/tắt nhanh bằng phím F</small></span>
                  <SettingsSwitch active={fullscreen} label="Chế độ toàn màn hình" onChange={() => void toggleFullscreen()} />
                </div>
              </section>
            )}

            {activeTab === "account" && (
              <section className="settings-v2__section">
                <header><h3>TÀI KHOẢN VÀ KẾT NỐI</h3><p>Thông tin lấy trực tiếp từ phiên chơi hiện tại.</p></header>
                <div className="settings-v2__info">
                  <span>Mã người chơi</span>
                  <strong>{playerId || "Chưa xác định"}</strong>
                  <button type="button" disabled={!playerId} onClick={() => void copyPlayerId()}>{copied ? "Đã sao chép" : "Sao chép"}</button>
                </div>
                <div className="settings-v2__info">
                  <span>Kết nối realtime</span>
                  <strong className={online ? "is-online" : "is-offline"}>{online ? "Đã kết nối" : "Đang kết nối lại"}</strong>
                </div>
                <div className="settings-v2__danger">
                  <span><strong>Đặt lại hướng dẫn</strong><small>Chỉ xóa tiến trình hướng dẫn và vị trí camera; không xóa đăng nhập.</small></span>
                  <button type="button" onClick={() => setConfirmAction("resetTutorial")}>Đặt lại</button>
                </div>
                {onLogout && (
                  <div className="settings-v2__danger">
                    <span><strong>Đăng xuất</strong><small>Quay về màn hình đăng nhập.</small></span>
                    <button type="button" onClick={() => setConfirmAction("logout")}>Đăng xuất</button>
                  </div>
                )}
              </section>
            )}

            {activeTab === "controls" && (
              <section className="settings-v2__section">
                <header><h3>ĐIỀU KHIỂN ĐANG HỖ TRỢ</h3><p>Danh sách được đối chiếu với handler hiện có trong engine.</p></header>
                <div className="settings-v2__hotkeys">
                  <div><kbd>Chuột trái</kbd><span>Chọn lãnh thổ, thành trì hoặc quân đội</span></div>
                  <div><kbd>Kéo bản đồ</kbd><span>Di chuyển camera</span></div>
                  <div><kbd>Cuộn chuột</kbd><span>Phóng to hoặc thu nhỏ</span></div>
                  <div><kbd>Esc</kbd><span>Bỏ chọn mục hiện tại</span></div>
                  <div><kbd>F</kbd><span>Bật hoặc tắt toàn màn hình</span></div>
                  <div><kbd>H</kbd><span>Ẩn hoặc hiện cây cối và địa vật</span></div>
                  <div><kbd>0</kbd><span>Đưa camera về trung tâm thế giới</span></div>
                </div>
              </section>
            )}
          </div>

          <footer className="settings-v2__footer">
            <span>Mọi thay đổi được áp dụng ngay</span>
            <button type="button" onClick={onClose}>ĐÓNG</button>
          </footer>
        </div>
      </MedievalModal>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction === "logout" ? "ĐĂNG XUẤT" : "ĐẶT LẠI HƯỚNG DẪN"}
          message={confirmAction === "logout" ? "Bạn có chắc muốn đăng xuất khỏi tài khoản hiện tại?" : "Tiến trình hướng dẫn và vị trí camera sẽ được đặt lại. Dữ liệu đăng nhập vẫn được giữ nguyên."}
          confirmLabel={confirmAction === "logout" ? "ĐĂNG XUẤT" : "ĐẶT LẠI"}
          icon={confirmAction === "logout" ? "settingsAccount" : "settingsInfo"}
          tone="danger"
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === "logout") {
              setConfirmAction(null);
              onClose();
              onLogout?.();
              return;
            }
            TUTORIAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
