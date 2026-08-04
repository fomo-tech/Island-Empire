import React, { useState } from "react";
import { MedievalModal } from "./MedievalModal";
import { ConfirmModal } from "./ConfirmModal";
import {
  EuroSettingsIcon,
  EuroAudioIcon,
  EuroDisplayIcon,
  EuroShieldIcon,
  EuroScrollIcon,
  EuroMusicIcon,
  EuroGlobeIcon,
  EuroFlagVI,
  EuroFlagEN,
  EuroInfoIcon,
} from "./EuroIcons";

const SettingsSwitch = ({
  active,
  onChange,
}: {
  active: boolean;
  onChange: () => void;
}) => {
  return (
    <button
      type="button"
      className={`settings-switch ${active ? "active" : ""}`}
      onClick={onChange}
      aria-pressed={active}
    >
      <span className="settings-switch-thumb" />
    </button>
  );
};

interface SettingsModalProps {
  language: "vi" | "en";
  onSetLanguage: (lang: "vi" | "en") => void;
  onLogout?: () => void;
  onClose: () => void;
}
export function SettingsModal({
  language,
  onSetLanguage,
  onLogout,
  onClose,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "audio" | "display" | "account" | "info"
  >("audio");
  const [confirmAction, setConfirmAction] = useState<
    "logout" | "resetTutorial" | null
  >(null);

  // Audio settings state
  const [bgmVolume, setBgmVolume] = useState<number>(80);
  const [sfxVolume, setSfxVolume] = useState<number>(90);
  const [bgmMuted, setBgmMuted] = useState<boolean>(false);
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);

  // Graphics & Display state
  const [graphicsQuality, setGraphicsQuality] = useState<
    "low" | "medium" | "high"
  >("high");
  const [targetFps, setTargetFps] = useState<30 | 60>(60);
  const [fogOfWarEffect, setFogOfWarEffect] = useState<boolean>(true);
  const [screenWarAlerts, setScreenWarAlerts] = useState<boolean>(true);

  // Success toast message
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  const handleSave = () => {
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 600);
  };

  const playerId =
    localStorage.getItem("island_empire_playerId") || "PLAYER-#92815";

  return (
    <>
      <MedievalModal
        title="CÀI ĐẶT HỆ THỐNG"
        subtitle="ĐẾ QUỐC PHỤC HƯNG · MÁY CHỦ S1"
        onClose={onClose}
        width="92vw"
        maxWidth="780px"
        className="settings-medieval-modal"
      >
        <div className="euro-shop-modal-body settings-euro-body">
          {/* 3D Metallic Navigation Tabs */}
          <nav className="euro-shop-tabs settings-modal-tabs">
            <button
              type="button"
              className={`euro-tab-btn ${activeTab === "audio" ? "active" : ""}`}
              onClick={() => setActiveTab("audio")}
            >
              <img
                src="/assets/icons/icon_settings_audio.png"
                alt="Âm thanh"
                className="euro-tab-png-icon"
              />
              <span>ÂM THANH</span>
            </button>
            <button
              type="button"
              className={`euro-tab-btn ${activeTab === "display" ? "active" : ""}`}
              onClick={() => setActiveTab("display")}
            >
              <img
                src="/assets/icons/icon_settings_display.png"
                alt="Hiển thị"
                className="euro-tab-png-icon"
              />
              <span>HIỂN THỊ</span>
            </button>
            <button
              type="button"
              className={`euro-tab-btn ${activeTab === "account" ? "active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <img
                src="/assets/icons/icon_settings_account.png"
                alt="Tài khoản"
                className="euro-tab-png-icon"
              />
              <span>TÀI KHOẢN</span>
            </button>
            <button
              type="button"
              className={`euro-tab-btn ${activeTab === "info" ? "active" : ""}`}
              onClick={() => setActiveTab("info")}
            >
              <img
                src="/assets/icons/icon_settings_info.png"
                alt="Phím tắt"
                className="euro-tab-png-icon"
              />
              <span>PHÍM TẮT</span>
            </button>
          </nav>

          {/* Tab Content Container */}
          <div className="settings-tab-container">
            {/* TAB 1: AUDIO */}
            {activeTab === "audio" && (
              <div className="settings-tab-content">
                <div className="settings-group-card">
                  <h3 className="settings-group-title">
                    <img
                      src="/assets/icons/icon_settings_audio.png"
                      alt="Audio"
                      className="euro-header-png-icon"
                    />
                    NHẠC NỀN & HIỆU ỨNG ÂM THANH
                  </h3>

                  {/* BGM Volume */}
                  <div className="settings-control-row">
                    <div className="settings-label-block">
                      <span className="settings-label">
                        Nhạc Nền Vương Quốc (BGM)
                      </span>
                      <span className="settings-subtext">
                        Âm lượng bản nhạc giao hưởng hùng đùa
                      </span>
                    </div>
                    <div className="settings-input-group">
                      <span
                        style={{
                          display: "inline-flex",
                          opacity: bgmMuted ? 0.35 : 0.85,
                        }}
                      >
                        <EuroMusicIcon size={18} />
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={bgmMuted ? 0 : bgmVolume}
                        onChange={(e) => {
                          setBgmVolume(Number(e.target.value));
                          if (bgmMuted) setBgmMuted(false);
                        }}
                        className="settings-slider"
                      />
                      <span className="settings-val-text">
                        {bgmMuted ? "Mute" : `${bgmVolume}%`}
                      </span>
                      <SettingsSwitch
                        active={!bgmMuted}
                        onChange={() => setBgmMuted(!bgmMuted)}
                      />
                    </div>
                  </div>

                  {/* SFX Volume */}
                  <div className="settings-control-row">
                    <div className="settings-label-block">
                      <span className="settings-label">
                        Hiệu Ứng Chiến Đấu & Nâng Cấp (SFX)
                      </span>
                      <span className="settings-subtext">
                        Âm thanh hành quân, giao tranh, binh khí
                      </span>
                    </div>
                    <div className="settings-input-group">
                      <span
                        style={{
                          display: "inline-flex",
                          opacity: sfxMuted ? 0.35 : 0.85,
                        }}
                      >
                        <EuroAudioIcon size={18} />
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sfxMuted ? 0 : sfxVolume}
                        onChange={(e) => {
                          setSfxVolume(Number(e.target.value));
                          if (sfxMuted) setSfxMuted(false);
                        }}
                        className="settings-slider"
                      />
                      <span className="settings-val-text">
                        {sfxMuted ? "Mute" : `${sfxVolume}%`}
                      </span>
                      <SettingsSwitch
                        active={!sfxMuted}
                        onChange={() => setSfxMuted(!sfxMuted)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DISPLAY & LANGUAGE */}
            {activeTab === "display" && (
              <div className="settings-tab-content">
                <div className="settings-group-card">
                  <h3 className="settings-group-title">
                    <EuroGlobeIcon size={20} /> NGÔN NGỮ HỆ THỐNG
                  </h3>
                  <div className="settings-control-row">
                    <div className="settings-label-block">
                      <span className="settings-label">Ngôn Ngữ Giao Diện</span>
                      <span className="settings-subtext">
                        Chuyển đổi Tiếng Việt hoặc English
                      </span>
                    </div>
                    <div className="settings-pill-group">
                      <button
                        type="button"
                        className={`settings-pill-btn ${language === "vi" ? "selected" : ""}`}
                        onClick={() => onSetLanguage("vi")}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <EuroFlagVI /> Tiếng Việt
                      </button>
                      <button
                        type="button"
                        className={`settings-pill-btn ${language === "en" ? "selected" : ""}`}
                        onClick={() => onSetLanguage("en")}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <EuroFlagEN /> English
                      </button>
                    </div>
                  </div>
                </div>

                <div className="settings-group-card">
                  <h3 className="settings-group-title">
                    <img
                      src="/assets/icons/icon_settings_display.png"
                      alt="Display"
                      className="euro-header-png-icon"
                    />
                    ĐỒ HỌA & HIỆU ỨNG BẢN ĐỒ
                  </h3>

                  {/* Graphics Quality */}
                  <div className="settings-control-row">
                    <div className="settings-label-block">
                      <span className="settings-label">Chất Lượng Đồ Họa</span>
                      <span className="settings-subtext">
                        Độ chi tiết lãnh thổ Hex & sương mù
                      </span>
                    </div>
                    <div className="settings-pill-group">
                      {(["low", "medium", "high"] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          className={`settings-pill-btn ${graphicsQuality === q ? "selected" : ""}`}
                          onClick={() => setGraphicsQuality(q)}
                        >
                          {q === "low"
                            ? "Thấp"
                            : q === "medium"
                              ? "Cân Bằng"
                              : "Cao"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target FPS */}
                  <div className="settings-control-row">
                    <div className="settings-label-block">
                      <span className="settings-label">
                        Tốc Độ Khung Hình (FPS)
                      </span>
                      <span className="settings-subtext">
                        Tối ưu độ mượt của camera di chuyển
                      </span>
                    </div>
                    <div className="settings-pill-group">
                      <button
                        type="button"
                        className={`settings-pill-btn ${targetFps === 30 ? "selected" : ""}`}
                        onClick={() => setTargetFps(30)}
                      >
                        30 FPS
                      </button>
                      <button
                        type="button"
                        className={`settings-pill-btn ${targetFps === 60 ? "selected" : ""}`}
                        onClick={() => setTargetFps(60)}
                      >
                        60 FPS (Mượt)
                      </button>
                    </div>
                  </div>

                  {/* Fog of war effect */}
                  <div className="settings-control-row">
                    <div className="settings-label-block">
                      <span className="settings-label">
                        Sương Mù Chiến Tranh (Fog of War)
                      </span>
                      <span className="settings-subtext">
                        Ẩn các vùng đất chưa do thám
                      </span>
                    </div>
                    <SettingsSwitch
                      active={fogOfWarEffect}
                      onChange={() => setFogOfWarEffect(!fogOfWarEffect)}
                    />
                  </div>

                  {/* Hide Territory Assets / Performance mode toggle */}
                  <div className="settings-control-row">
                    <div className="settings-label-block">
                      <span className="settings-label">
                        Ẩn Assets Lãnh Thổ (Phím 'H')
                      </span>
                      <span className="settings-subtext">
                        Ẩn cây cối, quặng & thú để tăng FPS
                      </span>
                    </div>
                    <SettingsSwitch
                      active={
                        localStorage.getItem("island_empire_hide_assets") ===
                        "true"
                      }
                      onChange={() => {
                        if ((window as any).toggleHideTerritoryAssets) {
                          (window as any).toggleHideTerritoryAssets();
                          setFogOfWarEffect((prev) => prev);
                        }
                      }}
                    />
                  </div>

                  {/* Screen War Alerts */}
                  <div className="settings-control-row">
                    <div className="settings-label-block">
                      <span className="settings-label">
                        Cảnh Báo Tấn Công Nổi Màn Hình
                      </span>
                      <span className="settings-subtext">
                        Tự động báo hiệu khi kẻ địch tới gần
                      </span>
                    </div>
                    <SettingsSwitch
                      active={screenWarAlerts}
                      onChange={() => setScreenWarAlerts(!screenWarAlerts)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ACCOUNT & SERVER */}
            {activeTab === "account" && (
              <div className="settings-tab-content">
                <div className="settings-group-card">
                  <h3 className="settings-group-title">
                    <img
                      src="/assets/icons/icon_settings_account.png"
                      alt="Account"
                      className="euro-header-png-icon"
                    />
                    TÀI KHOẢN & MÁY CHỦ KẾT NỐI
                  </h3>

                  <div className="settings-info-box">
                    <div className="settings-info-line">
                      <span>Mã ID Người Chơi:</span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <strong className="text-gold">{playerId}</strong>
                        <button
                          type="button"
                          className="settings-copy-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(playerId);
                            alert("Đã sao chép ID người chơi vào bộ nhớ tạm!");
                          }}
                        >
                          Sao chép
                        </button>
                      </span>
                    </div>
                    <div className="settings-info-line">
                      <span>Máy Chủ Đang Kết Nối:</span>
                      <strong className="text-green">
                        S1 - ĐẠI LỤC ELDORIA (250 Online)
                      </strong>
                    </div>
                    <div className="settings-info-line">
                      <span>Trạng Thái Đồng Bộ:</span>
                      <strong className="text-green">
                        Realtime Socket Ready
                      </strong>
                    </div>
                  </div>

                  <div className="settings-control-row danger-zone">
                    <div className="settings-label-block">
                      <span className="settings-label text-danger">
                        Đăng Xuất Tài Khoản
                      </span>
                      <span className="settings-subtext">
                        Thoát tài khoản hiện tại về màn hình chính
                      </span>
                    </div>
                    {onLogout && (
                      <button
                        type="button"
                        className="settings-danger-btn"
                        onClick={() => setConfirmAction("logout")}
                      >
                        Đăng Xuất
                      </button>
                    )}
                  </div>

                  <div className="settings-control-row danger-zone">
                    <div className="settings-label-block">
                      <span className="settings-label text-danger">
                        Đặt Lại Dữ Liệu Tân Thủ
                      </span>
                      <span className="settings-subtext">
                        Xóa bộ nhớ đệm vị trí camera và cài đặt
                      </span>
                    </div>
                    <button
                      type="button"
                      className="settings-danger-btn"
                      onClick={() => setConfirmAction("resetTutorial")}
                    >
                      Cài Lại Tân Thủ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: GAME INFO */}
            {activeTab === "info" && (
              <div className="settings-tab-content">
                <div className="settings-group-card">
                  <h3 className="settings-group-title">
                    <img
                      src="/assets/icons/icon_settings_info.png"
                      alt="Info"
                      className="euro-header-png-icon"
                    />
                    BẢNG PHÍM TẮT ĐIỀU KHIỂN
                  </h3>

                  <div className="settings-hotkeys-grid">
                    <div className="hotkey-item">
                      <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>
                      <span>Di chuyển Camera trên Bản đồ Hex</span>
                    </div>
                    <div className="hotkey-item">
                      <kbd>Cuộn Chuột</kbd>
                      <span>Phóng to / Thu nhỏ Thế giới</span>
                    </div>
                    <div className="hotkey-item">
                      <kbd>Click Chuột Trái</kbd>
                      <span>Chọn Lãnh thổ / Thành trì / Đội quân</span>
                    </div>
                    <div className="hotkey-item">
                      <kbd>Esc</kbd>
                      <span>Đóng Cửa sổ / Bảng Quản lý</span>
                    </div>
                  </div>
                </div>

                <div className="settings-group-card">
                  <h3 className="settings-group-title">
                    <EuroInfoIcon size={20} /> THÔNG TIN PHIÊN BẢN
                  </h3>
                  <div className="settings-info-box">
                    <div className="settings-info-line">
                      <span>Tên Game:</span>
                      <strong>Hex Rivals RTS · hexrivals.com</strong>
                    </div>
                    <div className="settings-info-line">
                      <span>Phiên Bản:</span>
                      <strong className="text-gold">v1.2.0 (Build 2026)</strong>
                    </div>
                    <div className="settings-info-line">
                      <span>Bản Quyền:</span>
                      <span>© 2026 hexrivals.com. All rights reserved.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Bar */}
          <div className="settings-modal-actions">
            {showSavedToast && (
              <span className="settings-saved-toast">
                ✓ Đã lưu cài đặt thành công!
              </span>
            )}
            <div className="settings-footer-buttons">
              <button
                type="button"
                className="euro-emerald-btn"
                onClick={handleSave}
              >
                LƯU CÀI ĐẶT
              </button>
              <button
                type="button"
                className="euro-btn-equip"
                onClick={onClose}
                style={{ width: 140 }}
              >
                ĐÓNG
              </button>
            </div>
          </div>
        </div>
      </MedievalModal>
      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction === "logout"
              ? "ĐĂNG XUẤT TÀI KHOẢN"
              : "ĐẶT LẠI HƯỚNG DẪN"
          }
          message={
            confirmAction === "logout"
              ? "Bạn có chắc chắn muốn rời khỏi vương quốc hiện tại không?"
              : "Toàn bộ hướng dẫn tân thủ, vị trí camera và cài đặt cục bộ sẽ được xóa. Hành động này không thể hoàn tác."
          }
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
            localStorage.clear();
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
