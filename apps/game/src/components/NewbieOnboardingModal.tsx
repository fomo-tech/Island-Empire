import React, { useState } from "react";

interface NewbieOnboardingModalProps {
  regionId: number;
  onConfirm: (flagColor: string, emblem: string) => void;
  onCancel: () => void;
}

const REGAL_COLORS = [
  { name: "Royal Gold", color: "#f59e0b", secondary: "#d97706" },
  { name: "Crimson Red", color: "#ef4444", secondary: "#b91c1c" },
  { name: "Prussian Blue", color: "#3b82f6", secondary: "#1d4ed8" },
  { name: "Imperial Purple", color: "#a855f7", secondary: "#7e22ce" },
  { name: "Forest Green", color: "#10b981", secondary: "#047857" },
  { name: "Void Obsidian", color: "#475569", secondary: "#1e293b" }
];

const EMBLEMS = [
  {
    id: "eagle",
    name: "Đền thờ Hy Lạp",
    svg: (color: string) => (
      <svg viewBox="0 0 24 24" width="28" height="28" fill={color}>
        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6C14,6.74 13.59,7.39 13,7.73V9H15V8H17V10H15.5C15.9,10.63 16,11.53 15.75,12.25L17.5,14H15.5L14,12.5V15H10V12.5L8.5,14H6.5L8.25,12.25C8,11.53 8.1,10.63 8.5,10H7V8H9V9H11V7.73C10.41,7.39 10,0.74 10,6A2,2 0 0,1 12,4Z" />
      </svg>
    )
  },
  {
    id: "dragon",
    name: "Cung điện Á Đông",
    svg: (color: string) => (
      <svg viewBox="0 0 24 24" width="28" height="28" fill={color}>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 14.5c-.7.7-1.7.9-2.5.4l-1.3 1.3v-2.5c-.5-.8-.3-1.8.4-2.5.8-.8 2-.8 2.8 0l-1.4 1.4 2 2zM15 11c0 1.7-1.3 3-3 3-1.1 0-2.1-.6-2.6-1.5L7 14.9V12c0-2.8 2.2-5 5-5h3v4z" />
      </svg>
    )
  },
  {
    id: "lion",
    name: "Nhà dài Viking",
    svg: (color: string) => (
      <svg viewBox="0 0 24 24" width="28" height="28" fill={color}>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4 7c0 .6-.4 1-1 1h-2v2h2v4h-6v-4h2v-2H9c-.6 0-1-.4-1-1v-2h8v2z" />
      </svg>
    )
  },
  {
    id: "swords",
    name: "Lâu đài Gothic",
    svg: (color: string) => (
      <svg viewBox="0 0 24 24" width="28" height="28" fill={color}>
        <path d="M21.9 2.1c-.4-.4-1-.4-1.4 0l-4.9 4.9c-.8-.2-1.7-.1-2.4.4-.8.5-1.2 1.4-1.2 2.3l-5.6 5.6-2.1-.7c-.3-.1-.7 0-.9.2L2.1 16c-.3.3-.3.7 0 1l2.8 2.8c.1.1.3.2.5.2s.4-.1.5-.2l5.6-5.6 1.4.5c.3.1.7 0 .9-.2l1.2-1.2c.3-.3.3-.7.2-1l-.7-2.1 5.6-5.6c.9 0 1.8-.4 2.3-1.2.5-.7.6-1.6.4-2.4l4.9-4.9c.4-.4.4-1 0-1.4z" />
      </svg>
    )
  },
  {
    id: "crown",
    name: "Lâu đài Trung Cổ",
    svg: (color: string) => (
      <svg viewBox="0 0 24 24" width="28" height="28" fill={color}>
        <path d="M12 2L15 8L21.5 5.5L18 17H6L2.5 5.5L9 8L12 2M5 19H19V21H5V19Z" />
      </svg>
    )
  },
  {
    id: "shield",
    name: "Pháo đài Thép",
    svg: (color: string) => (
      <svg viewBox="0 0 24 24" width="28" height="28" fill={color}>
        <path d="M12,2L2,6V12C2,18.55 6.27,24.63 12,26C17.73,24.63 22,18.55 22,12V6L12,2M12,4.3L20,7.5V12C20,17.3 16.59,22.4 12,23.7C7.41,22.4 4,17.3 4,12V7.5L12,4.3Z" />
      </svg>
    )
  }
];

export function NewbieOnboardingModal({ regionId, onConfirm, onCancel }: NewbieOnboardingModalProps) {
  const [selectedColor, setSelectedColor] = useState(REGAL_COLORS[0]);
  const [selectedEmblem, setSelectedEmblem] = useState(EMBLEMS[4]); // default to crown

  const handleConfirm = () => {
    onConfirm(selectedColor.color, selectedEmblem.id);
  };

  return (
    <div className="ob-modal-overlay">
      <div className="ob-modal-container">
        {/* Glow Top Accent */}
        <div className="ob-modal-glow" style={{ background: `linear-gradient(90deg, transparent, ${selectedColor.color}, transparent)` }} />
        
        {/* Header */}
        <div className="ob-modal-header">
          <h2 className="ob-modal-title">THIẾT LẬP CỜ HIỆU ĐẾ CHẾ</h2>
          <p className="ob-modal-subtitle">Xác nhận mảnh đất khởi nguyên #{regionId + 1} của bạn</p>
        </div>

        <div className="ob-modal-content">
          {/* Flag Preview Section */}
          <div className="ob-preview-section">
            <div className="ob-flag-pole">
              <div className="ob-pole-tip" />
              <div className="ob-pole-shaft" />
            </div>
            <div className="ob-flag-banner" style={{ background: `linear-gradient(135deg, ${selectedColor.color}, ${selectedColor.secondary})` }}>
              <div className="ob-flag-emblem">
                {selectedEmblem.svg("#ffffff")}
              </div>
              {/* Gold Fringe Decoration */}
              <div className="ob-flag-fringe" />
            </div>
            <div className="ob-preview-title">XEM TRƯỚC CỜ</div>
          </div>

          {/* Controls Section */}
          <div className="ob-controls-section">
            {/* Color Select */}
            <div className="ob-control-group">
              <label className="ob-control-label">MÀU SẮC ĐẾ QUỐC</label>
              <div className="ob-color-grid">
                {REGAL_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`ob-color-btn ${selectedColor.color === c.color ? "active" : ""}`}
                    style={{ background: `linear-gradient(135deg, ${c.color}, ${c.secondary})` }}
                    onClick={() => setSelectedColor(c)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Emblem Select */}
            <div className="ob-control-group">
              <label className="ob-control-label">PHONG CÁCH KIẾN TRÚC THỦ ĐÔ</label>
              <div className="ob-emblem-grid">
                {EMBLEMS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={`ob-emblem-btn ${selectedEmblem.id === e.id ? "active" : ""}`}
                    onClick={() => setSelectedEmblem(e)}
                    title={e.name}
                  >
                    <div className="ob-emblem-icon">
                      {e.svg(selectedEmblem.id === e.id ? "#ffd34d" : "#94a3b8")}
                    </div>
                    <span className="ob-emblem-name">{e.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ob-modal-actions">
          <button type="button" className="ob-action-btn secondary" onClick={onCancel}>
            HỦY BỎ
          </button>
          <button type="button" className="ob-action-btn primary" onClick={handleConfirm}>
            XÁC NHẬN XÂY THÀNH
          </button>
        </div>
      </div>
    </div>
  );
}
