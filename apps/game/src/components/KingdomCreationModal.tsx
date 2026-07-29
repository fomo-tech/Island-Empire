import React, { useState } from "react";
import { createPortal } from "react-dom";

interface KingdomCreationModalProps {
  onClose: () => void;
  onConfirm: (flagColor: string, emblem: string, cityName: string) => void;
  defaultCityName?: string;
}

const FLAG_COLORS = [
  { id: "#ef4444", name: "Đỏ Hoàng Gia" },
  { id: "#2563eb", name: "Lam Hải Quân" },
  { id: "#f59e0b", name: "Vàng Hoàng Kim" },
  { id: "#10b981", name: "Lục Bảo Royale" },
  { id: "#8b5cf6", name: "Tím Quyền Lực" },
  { id: "#06b6d4", name: "Xanh Cyan Băng" },
  { id: "#ec4899", name: "Hồng Kiều Mị" },
  { id: "#64748b", name: "Xám Bạc Thép" },
];

const EMBLEMS = [
  { id: "crown", name: "Vương Miện", icon: "♛" },
  { id: "swords", name: "Thánh Kiếm", icon: "⚔" },
  { id: "shield", name: "Khiên Thép", icon: "◆" },
  { id: "eagle", name: "Đại Bàng", icon: "▲" },
  { id: "lion", name: "Sư Tử Vương", icon: "✦" },
  { id: "dragon", name: "Rồng Thiêng", icon: "◇" },
];

export function KingdomCreationModal({
  onClose,
  onConfirm,
  defaultCityName = "Thành Trì Vương Quốc",
}: KingdomCreationModalProps) {
  const [cityName, setCityName] = useState(defaultCityName);
  const [selectedColor, setSelectedColor] = useState("#f59e0b");
  const [selectedEmblem, setSelectedEmblem] = useState("crown");

  const selectedColorName = FLAG_COLORS.find((color) => color.id === selectedColor)?.name || "";
  const selectedEmblemInfo = EMBLEMS.find((emblem) => emblem.id === selectedEmblem) || EMBLEMS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = cityName.trim() || "Thành Trì Tân Thủ";
    onConfirm(selectedColor, selectedEmblem, finalName);
  };

  return createPortal(
    <div className="kc-backdrop" role="dialog" aria-modal="true" aria-label="Khởi tạo thành trì tân thủ">
      <div className="kc-card">
        <div className="kc-header">
          <button type="button" onClick={onClose} className="kc-close" aria-label="Đóng">
            ×
          </button>
          <div className="kc-crown">♛</div>
          <h2>Khởi Tạo Thành Trì Tân Thủ</h2>
          <p>Chọn tên thành phố, màu cờ và biểu tượng đại diện cho vương quốc của bạn.</p>
        </div>

        <form onSubmit={handleSubmit} className="kc-form">
          <div className="kc-preview">
            <div className="kc-flag" style={{ backgroundColor: selectedColor }}>
              <div className="kc-flag-icon">{selectedEmblemInfo.icon}</div>
              <div className="kc-flag-foot" />
            </div>
            <div className="kc-preview-copy">
              <span>Tên Thành Phố</span>
              <h3>{cityName.trim() || "Thành Trì Tân Thủ"}</h3>
              <p>
                Cờ: <b style={{ color: selectedColor }}>{selectedColorName}</b>
                <span> • </span>
                Biểu tượng: <b>{selectedEmblemInfo.name}</b>
              </p>
            </div>
          </div>

          <div className="kc-section">
            <label htmlFor="kingdom-city-name">1. Tên Thành Phố / Vương Quốc</label>
            <input
              id="kingdom-city-name"
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="Nhập tên thành phố của bạn..."
              maxLength={24}
              required
              className="kc-input"
            />
          </div>

          <div className="kc-section">
            <label>2. Chọn Màu Cờ Hoàng Gia</label>
            <div className="kc-color-grid">
              {FLAG_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.id)}
                  className={`kc-choice kc-color-choice ${selectedColor === color.id ? "selected" : ""}`}
                >
                  <span className="kc-swatch" style={{ backgroundColor: color.id }} />
                  <span>{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="kc-section">
            <label>3. Chọn Biểu Tượng Vương Quốc</label>
            <div className="kc-emblem-grid">
              {EMBLEMS.map((emblem) => (
                <button
                  key={emblem.id}
                  type="button"
                  onClick={() => setSelectedEmblem(emblem.id)}
                  className={`kc-choice kc-emblem-choice ${selectedEmblem === emblem.id ? "selected" : ""}`}
                >
                  <span className="kc-emblem-icon">{emblem.icon}</span>
                  <span>{emblem.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="kc-actions">
            <button type="button" onClick={onClose} className="kc-btn kc-btn-secondary">
              Hủy Bỏ
            </button>
            <button type="submit" className="kc-btn kc-btn-primary">
              Xác Nhận Lập Thành
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
