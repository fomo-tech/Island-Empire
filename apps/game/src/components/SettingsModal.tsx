import React, { useState } from "react";

interface SettingsModalProps {
  language: "vi" | "en";
  onSetLanguage: (lang: "vi" | "en") => void;
  onLogout?: () => void;
  onClose: () => void;
}

export function SettingsModal({ language, onSetLanguage, onLogout, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"audio" | "display" | "account" | "info">("audio");

  // Audio settings state
  const [bgmVolume, setBgmVolume] = useState<number>(80);
  const [sfxVolume, setSfxVolume] = useState<number>(90);
  const [bgmMuted, setBgmMuted] = useState<boolean>(false);
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);

  // Graphics & Display state
  const [graphicsQuality, setGraphicsQuality] = useState<"low" | "medium" | "high">("high");
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

  const playerId = localStorage.getItem("island_empire_playerId") || "PLAYER-#92815";

  return (
    <div className="ob-modal-overlay town-modal-overlay" onClick={onClose}>
      <div className="ob-modal-container town-modal settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Sleek Gold Filigree Close Button */}
        <button type="button" className="town-close-btn" onClick={onClose} aria-label="Đóng cài đặt">
          ✕
        </button>

        {/* Epic Top Heraldic Crest */}
        <div className="town-modal-crest" aria-hidden="true">
          <div className="crest-lion-badge">
            <svg viewBox="0 0 60 60" className="crest-svg">
              <path d="M 30,4 L 52,14 C 52,40 30,56 30,56 C 30,56 8,40 8,14 Z" fill="#0f172a" stroke="#ca8a04" strokeWidth="3" />
              <path d="M 30,8 L 48,16 C 48,37 30,51 30,51 C 30,51 12,37 12,16 Z" fill="#1e3a8a" />
              <circle cx="30" cy="30" r="8" fill="none" stroke="#fef08a" strokeWidth="2.5" />
              <path d="M 30,18 L 30,42 M 18,30 L 42,30 M 21,21 L 39,39 M 39,21 L 21,39" stroke="#fef08a" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Modal Header */}
        <div className="ob-modal-header town-modal-header">
          <h2 className="ob-modal-title town-title">CÀI ĐẶT HỆ THỐNG</h2>
          <p className="ob-modal-subtitle town-subtitle">ĐẾ QUỐC PHỤC HƯNG · MÁY CHỦ S1</p>
        </div>

        <div className="town-divider" />

        {/* Tab Selection Bar */}
        <div className="town-modal-tabs settings-modal-tabs">
          <button
            type="button"
            className={`town-tab-btn ${activeTab === "audio" ? "active" : ""}`}
            onClick={() => setActiveTab("audio")}
          >
            ÂM THANH
          </button>
          <button
            type="button"
            className={`town-tab-btn ${activeTab === "display" ? "active" : ""}`}
            onClick={() => setActiveTab("display")}
          >
            HIỂN THỊ & NGÔN NGỮ
          </button>
          <button
            type="button"
            className={`town-tab-btn ${activeTab === "account" ? "active" : ""}`}
            onClick={() => setActiveTab("account")}
          >
            TÀI KHOẢN
          </button>
          <button
            type="button"
            className={`town-tab-btn ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            THÔNG TIN
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="town-modal-body settings-modal-body">
          {/* TAB 1: AUDIO */}
          {activeTab === "audio" && (
            <div className="settings-tab-content">
              <div className="settings-group-card">
                <h3 className="settings-group-title">NHẠC NỀN & HIỆU ỨNG</h3>

                {/* BGM Volume */}
                <div className="settings-control-row">
                  <div className="settings-label-block">
                    <span className="settings-label">Nhạc Nền (BGM)</span>
                    <span className="settings-subtext">Âm lượng âm nhạc nền vương quốc</span>
                  </div>
                  <div className="settings-input-group">
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
                    <span className="settings-val-text">{bgmMuted ? "Mute" : `${bgmVolume}%`}</span>
                    <button
                      type="button"
                      className={`settings-toggle-btn ${bgmMuted ? "muted" : "active"}`}
                      onClick={() => setBgmMuted(!bgmMuted)}
                    >
                      {bgmMuted ? "Tắt" : "Bật"}
                    </button>
                  </div>
                </div>

                {/* SFX Volume */}
                <div className="settings-control-row">
                  <div className="settings-label-block">
                    <span className="settings-label">Hiệu Ứng Âm Thanh (SFX)</span>
                    <span className="settings-subtext">Âm thanh hành quân, chiến đấu, nâng cấp thành</span>
                  </div>
                  <div className="settings-input-group">
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
                    <span className="settings-val-text">{sfxMuted ? "Mute" : `${sfxVolume}%`}</span>
                    <button
                      type="button"
                      className={`settings-toggle-btn ${sfxMuted ? "muted" : "active"}`}
                      onClick={() => setSfxMuted(!sfxMuted)}
                    >
                      {sfxMuted ? "Tắt" : "Bật"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISPLAY & LANGUAGE */}
          {activeTab === "display" && (
            <div className="settings-tab-content">
              <div className="settings-group-card">
                <h3 className="settings-group-title">NGÔN NGỮ HỆ THỐNG</h3>
                <div className="settings-control-row">
                  <div className="settings-label-block">
                    <span className="settings-label">Ngôn Ngữ Game</span>
                    <span className="settings-subtext">Chuyển đổi giao diện Tiếng Việt hoặc English</span>
                  </div>
                  <div className="settings-pill-group">
                    <button
                      type="button"
                      className={`settings-pill-btn ${language === "vi" ? "selected" : ""}`}
                      onClick={() => onSetLanguage("vi")}
                    >
                      Tiếng Việt
                    </button>
                    <button
                      type="button"
                      className={`settings-pill-btn ${language === "en" ? "selected" : ""}`}
                      onClick={() => onSetLanguage("en")}
                    >
                      English
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-group-card">
                <h3 className="settings-group-title">ĐỒ HỌA & HIỆU ỨNG BẢN ĐỒ</h3>
                
                {/* Graphics Quality */}
                <div className="settings-control-row">
                  <div className="settings-label-block">
                    <span className="settings-label">Chất Lượng Đồ Họa</span>
                    <span className="settings-subtext">Độ chi tiết lãnh thổ hex & sương mù chiến tranh</span>
                  </div>
                  <div className="settings-pill-group">
                    {(["low", "medium", "high"] as const).map((q) => (
                      <button
                        key={q}
                        type="button"
                        className={`settings-pill-btn ${graphicsQuality === q ? "selected" : ""}`}
                        onClick={() => setGraphicsQuality(q)}
                      >
                        {q === "low" ? "Thấp" : q === "medium" ? "Cân Bằng" : "Cao"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target FPS */}
                <div className="settings-control-row">
                  <div className="settings-label-block">
                    <span className="settings-label">Tốc Độ Khung Hình (FPS)</span>
                    <span className="settings-subtext">Tối ưu mượt mà cho trải nghiệm camera map</span>
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
                      60 FPS
                    </button>
                  </div>
                </div>

                {/* Fog of war effect */}
                <div className="settings-control-row">
                  <div className="settings-label-block">
                    <span className="settings-label">Sương Mù Chiến Tranh (Fog of War)</span>
                    <span className="settings-subtext">Ẩn các vùng đất chưa có do thám hoặc sự hiện diện</span>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle-btn ${fogOfWarEffect ? "active" : "muted"}`}
                    onClick={() => setFogOfWarEffect(!fogOfWarEffect)}
                  >
                    {fogOfWarEffect ? "Đang Bật" : "Đã Tắt"}
                  </button>
                </div>

                {/* Screen War Alerts */}
                <div className="settings-control-row">
                  <div className="settings-label-block">
                    <span className="settings-label">Cảnh Báo Tấn Công Nổi Màn Hình</span>
                    <span className="settings-subtext">Tự động phát tín hiệu đỏ khi kẻ địch hành quân</span>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle-btn ${screenWarAlerts ? "active" : "muted"}`}
                    onClick={() => setScreenWarAlerts(!screenWarAlerts)}
                  >
                    {screenWarAlerts ? "Bật Cảnh Báo" : "Tắt Cảnh Báo"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT & SERVER */}
          {activeTab === "account" && (
            <div className="settings-tab-content">
              <div className="settings-group-card">
                <h3 className="settings-group-title">THÔNG TIN TÀI KHOẢN & MÁY CHỦ</h3>

                <div className="settings-info-box">
                  <div className="settings-info-line">
                    <span>Mã ID Người Chơi:</span>
                    <strong className="text-gold">{playerId}</strong>
                  </div>
                  <div className="settings-info-line">
                    <span>Máy Chủ Đang Kết Nối:</span>
                    <strong className="text-green">S1 - ĐẠI LỤC ELDORIA (250 Online)</strong>
                  </div>
                  <div className="settings-info-line">
                    <span>Trạng Thái Đồng Bộ:</span>
                    <strong className="text-green">Realtime Socket Ready</strong>
                  </div>
                </div>

                <div className="settings-control-row danger-zone">
                  <div className="settings-label-block">
                    <span className="settings-label text-danger">Đăng Xuất Tài Khoản</span>
                    <span className="settings-subtext">Thoát tài khoản hiện tại và quay về màn hình đăng nhập</span>
                  </div>
                  {onLogout && (
                    <button
                      type="button"
                      className="settings-danger-btn"
                      style={{ backgroundColor: "#ef4444", borderColor: "#dc2626", color: "#ffffff" }}
                      onClick={() => {
                        if (window.confirm("Bạn có chắc chắn muốn đăng xuất tài khoản không?")) {
                          onClose();
                          onLogout();
                        }
                      }}
                    >
                      Đăng Xuất
                    </button>
                  )}
                </div>

                <div className="settings-control-row danger-zone">
                  <div className="settings-label-block">
                    <span className="settings-label text-danger">Đặt Lại Dữ Liệu Tân Thủ</span>
                    <span className="settings-subtext">Xóa bộ nhớ đệm vị trí camera và khôi phục cài đặt gốc</span>
                  </div>
                  <button
                    type="button"
                    className="settings-danger-btn"
                    onClick={() => {
                      if (window.confirm("Bạn có chắc chắn muốn cài lại hướng dẫn tân thủ không?")) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
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
                <h3 className="settings-group-title">ĐIỀU KHIỂN & PHÍM TẮT</h3>
                
                <div className="settings-hotkeys-grid">
                  <div className="hotkey-item">
                    <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>
                    <span>Di chuyển Camera trên Bản đồ</span>
                  </div>
                  <div className="hotkey-item">
                    <kbd>Cuộn Chuột</kbd>
                    <span>Phóng to / Thu nhỏ Thế giới Hex</span>
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
                <h3 className="settings-group-title">THÔNG TIN PHIÊN BẢN</h3>
                <div className="settings-info-box">
                  <div className="settings-info-line">
                    <span>Tên Game:</span>
                    <strong>Island Empire RTS · Đảo Quốc Chiến Thuật</strong>
                  </div>
                  <div className="settings-info-line">
                    <span>Phiên Bản:</span>
                    <strong className="text-gold">v1.2.0 (Build 2026)</strong>
                  </div>
                  <div className="settings-info-line">
                    <span>Bản Quyền:</span>
                    <span>© 2026 Island Empire Studio. All rights reserved.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="ob-modal-actions town-modal-actions settings-modal-actions">
          {showSavedToast && <span className="settings-saved-toast">Đã lưu cài đặt thành công!</span>}
          <div className="settings-footer-buttons">
            <button type="button" className="recruit-btn primary-action" onClick={handleSave}>
              LƯU CÀI ĐẶT
            </button>
            <button type="button" className="ob-action-btn secondary town-footer-btn" onClick={onClose}>
              ĐÓNG CÀI ĐẶT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
