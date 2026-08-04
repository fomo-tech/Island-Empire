import React, { useState } from "react";
import { kingdomArchitectureMeta } from "../game/kingdomArchitecture";
import { KingdomBuildingSprite } from "./KingdomBuildingSprite";
import { AssetIcon } from "./AssetIcon";

interface NewbieOnboardingModalProps {
  onClose: () => void;
  onConfirm?: () => void;
  architectureId?: string | null;
}

// Vector SVGs
function OpenBookLaurelIcon() {
  return <AssetIcon asset="scroll" size={42} />;
  return (
    <svg viewBox="0 0 64 48" width="42" height="32" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="bookGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff099" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
      </defs>
      <path d="M 8 36 C 2 24 6 12 14 6 C 10 14 12 26 18 32 Z" fill="url(#bookGold)" opacity="0.8" />
      <path d="M 56 36 C 62 24 58 12 50 6 C 54 14 52 26 46 32 Z" fill="url(#bookGold)" opacity="0.8" />
      <path d="M 32 14 Q 20 8 6 14 L 6 38 Q 20 32 32 38 Q 44 32 58 38 L 58 14 Q 44 8 32 14 Z" fill="#1e293b" stroke="url(#bookGold)" strokeWidth="2" />
      <line x1="32" y1="14" x2="32" y2="38" stroke="url(#bookGold)" strokeWidth="2" />
      <line x1="12" y1="20" x2="26" y2="17" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="12" y1="26" x2="26" y2="23" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="38" y1="17" x2="52" y2="20" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="38" y1="23" x2="52" y2="26" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  );
}

function CastleStepIcon() {
  return <AssetIcon asset="castle" size={34} />;
  return (
    <svg viewBox="0 0 64 64" width="34" height="34" style={{ flexShrink: 0 }}>
      <path d="M 12 24 H 20 V 32 H 28 V 24 H 36 V 32 H 44 V 24 H 52 V 56 H 12 Z" fill="#3b82f6" stroke="#ffd34d" strokeWidth="2" />
      <polygon points="12,24 20,12 28,24" fill="#ef4444" stroke="#78350f" strokeWidth="1" />
      <polygon points="36,24 44,12 52,24" fill="#ef4444" stroke="#78350f" strokeWidth="1" />
      <rect x="26" y="40" width="12" height="16" fill="#1e293b" stroke="#ffd34d" strokeWidth="1.5" />
      <path d="M 26 40 A 6 6 0 0 1 38 40" fill="#ffd34d" />
    </svg>
  );
}

function SwordsStepIcon() {
  return <AssetIcon asset="army" size={34} />;
  return (
    <svg viewBox="0 0 64 64" width="34" height="34" style={{ flexShrink: 0 }}>
      <line x1="12" y1="12" x2="52" y2="52" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
      <polygon points="12,12 20,15 15,20" fill="#38bdf8" />
      <line x1="52" y1="12" x2="12" y2="52" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
      <polygon points="52,12 47,20 44,15" fill="#38bdf8" />
      <circle cx="32" cy="32" r="5" fill="#ffd34d" stroke="#78350f" strokeWidth="1" />
    </svg>
  );
}

function AllianceStepIcon() {
  return <AssetIcon asset="guild" size={34} />;
  return (
    <svg viewBox="0 0 64 64" width="34" height="34" style={{ flexShrink: 0 }}>
      <path d="M 14 36 C 22 24 30 24 36 34 L 46 24 C 54 32 50 44 42 48 L 32 40 L 24 48 Z" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="#4ade80" strokeWidth="2" strokeDasharray="4 2" />
    </svg>
  );
}

function ResourceStepIcon() {
  return <AssetIcon asset="food" size={34} />;
  return (
    <svg viewBox="0 0 64 64" width="34" height="34" style={{ flexShrink: 0 }}>
      <rect x="12" y="24" width="20" height="24" rx="3" fill="#d97706" stroke="#fef08a" strokeWidth="2" />
      <polygon points="32,16 48,26 32,36" fill="#0284c7" stroke="#fef08a" strokeWidth="2" />
      <circle cx="44" cy="44" r="8" fill="#ffd34d" stroke="#78350f" strokeWidth="1.5" />
    </svg>
  );
}

function CrownStepIcon() {
  return <AssetIcon asset="crown" size={34} />;
  return (
    <svg viewBox="0 0 64 64" width="34" height="34" style={{ flexShrink: 0 }}>
      <polygon points="12,48 8,20 24,32 32,12 40,32 56,20 52,48" fill="#eab308" stroke="#78350f" strokeWidth="2" />
      <rect x="12" y="48" width="40" height="6" fill="#ca8a04" stroke="#78350f" strokeWidth="1" />
      <circle cx="32" cy="10" r="3" fill="#fff" />
      <circle cx="8" cy="18" r="2.5" fill="#fff" />
      <circle cx="56" cy="18" r="2.5" fill="#fff" />
    </svg>
  );
}

// 4 Sub-Action SVGs
function SubTerritoryIcon() {
  return <AssetIcon asset="map" size={28} />;
  return (
    <svg viewBox="0 0 36 36" width="28" height="28" fill="#ffd34d">
      <path d="M 18 4 L 4 12 V 24 L 18 32 L 32 24 V 12 Z" fill="#1e3a8a" stroke="#ffd34d" strokeWidth="2" />
      <path d="M 18 10 L 26 15 V 21 L 18 26 L 10 21 V 15 Z" fill="#3b82f6" />
    </svg>
  );
}

function SubRecruitIcon() {
  return <AssetIcon asset="troopInfantry" size={28} />;
  return (
    <svg viewBox="0 0 36 36" width="28" height="28">
      <circle cx="18" cy="12" r="6" fill="#ffd34d" stroke="#78350f" strokeWidth="1.5" />
      <path d="M 8 28 Q 18 20 28 28 V 32 H 8 Z" fill="#3b82f6" stroke="#ffd34d" strokeWidth="1.5" />
    </svg>
  );
}

function SubAllianceIcon() {
  return <AssetIcon asset="guild" size={28} />;
  return (
    <svg viewBox="0 0 36 36" width="28" height="28">
      <path d="M 8 18 Q 18 8 28 18 Q 18 28 8 18 Z" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  );
}

function SubFameIcon() {
  return <AssetIcon asset="crown" size={28} />;
  return (
    <svg viewBox="0 0 36 36" width="28" height="28">
      <polygon points="18,4 22,14 32,14 24,20 27,30 18,24 9,30 12,20 4,14 14,14" fill="#ffd34d" stroke="#78350f" strokeWidth="1" />
    </svg>
  );
}

const STEPS_DATA = [
  {
    id: 1,
    badgeColor: "#ffd34d",
    badgeBorder: "#ca8a04",
    icon: <CastleStepIcon />,
    title: "KHAI HOÀNG XÂY THÀNH",
    shortDesc: "Khai hoang mảnh đất hoang dã vàng cát, dựng thành trì đầu tiên và mở rộng vương quốc.",
    detailTitle: "1. KHAI HOÀNG XÂY THÀNH",
    detailDesc: "Nhấp chọn mảnh đất hoang dã (chưa có chủ, màu vàng cát) trên bản đồ hex và chọn 'Khai hoang' để dựng thành trì đầu tiên. Vùng đất sở hữu sẽ lập tức chuyển sang màu xanh lá và tự động sản xuất tài nguyên.",
    subItems: [
      { icon: <SubTerritoryIcon />, title: "Chọn đất hoang cát" },
      { icon: <SubRecruitIcon />, title: "Lệnh Khai hoang" },
      { icon: <SubAllianceIcon />, title: "Chiếm giữ ô Hex" },
      { icon: <SubFameIcon />, title: "Tự sinh tài nguyên" }
    ]
  },
  {
    id: 2,
    badgeColor: "#3b82f6",
    badgeBorder: "#1d4ed8",
    icon: <SwordsStepIcon />,
    title: "MỘ BINH & ĐIỀU BINH",
    shortDesc: "Chiêu mộ Bộ binh, Kị binh & Pháo binh để phát động tấn công hoặc viện trợ quân nhu.",
    detailTitle: "2. MỘ BINH & ĐIỀU BINH",
    detailDesc: "Nhấp vào thành trì đã sở hữu để mở Quản lý Thành phố. Chiêu mộ 3 chủng binh chiến lược: Bộ binh (Thủ tốt), Kị binh (Tốc độ cao) và Pháo binh (Phá công thành). Chọn 'Phát động tấn công' hoặc 'Tiếp viện' để điều động sang ô lân cận.",
    subItems: [
      { icon: <SubRecruitIcon />, title: "Chiêu mộ Bộ binh" },
      { icon: <SubRecruitIcon />, title: "Huấn luyện Kị binh" },
      { icon: <SubRecruitIcon />, title: "Đúc Pháo binh" },
      { icon: <SubTerritoryIcon />, title: "Điều binh xuất trận" }
    ]
  },
  {
    id: 3,
    badgeColor: "#22c55e",
    badgeBorder: "#15803d",
    icon: <AllianceStepIcon />,
    title: "THAM GIA LIÊN MINH",
    shortDesc: "Kết giao bằng hữu, thành lập liên minh và đồng lòng đánh chiếm cứ điểm lớn.",
    detailTitle: "3. THAM GIA LIÊN MINH",
    detailDesc: "Click biểu tượng Liên Minh trên thanh HUD để tìm kiếm hoặc gia nhập đồng minh. Thành viên liên minh có thể trao đổi tài nguyên, chi viện quân đồn trú phòng thủ và cùng nhau phối hợp đánh chiếm các ô đất trọng yếu.",
    subItems: [
      { icon: <SubAllianceIcon />, title: "Gia nhập Liên minh" },
      { icon: <SubAllianceIcon />, title: "Trợ giúp quân nhu" },
      { icon: <SubTerritoryIcon />, title: "Đồn trú phòng thủ" },
      { icon: <SubFameIcon />, title: "Đồng lòng đánh chiếm" }
    ]
  },
  {
    id: 4,
    badgeColor: "#0284c7",
    badgeBorder: "#0369a1",
    icon: <ResourceStepIcon />,
    title: "QUẢN LÝ THÀNH PHỐ",
    shortDesc: "Theo dõi ngân khố Lương, Gỗ, Đá, Vàng và Ngọc; nâng cấp kho để tăng sức chứa.",
    detailTitle: "4. QUẢN LÝ THÀNH PHỐ & TÀI NGUYÊN",
    detailDesc: "Mỗi lãnh thổ có sản lượng Lương thực, Gỗ, Đá và Vàng khác nhau. Ngọc chỉ sinh tại Mỏ Ngọc hiếm. Chú ý dung tích kho để tránh tràn.",
    subItems: [
      { icon: <SubTerritoryIcon />, title: "Ngân khố 5 Tài nguyên" },
      { icon: <SubFameIcon />, title: "Sản xuất +135%/giờ" },
      { icon: <SubTerritoryIcon />, title: "Dung tích Kho chứa" },
      { icon: <SubRecruitIcon />, title: "Phòng thủ đồn trú" }
    ]
  },
  {
    id: 5,
    badgeColor: "#eab308",
    badgeBorder: "#a16207",
    icon: <CrownStepIcon />,
    title: "BÁ CHỦ VƯƠNG QUỐC",
    shortDesc: "Nâng cao Uy Danh Chiến Thuật, Quân Lực và xưng Vương trên bảng xếp hạng.",
    detailTitle: "5. BÁ CHỦ VƯƠNG QUỐC",
    detailDesc: "Gia tăng điểm Uy Danh Chiến Thuật (Strategic Fame), mở rộng bản đồ ô lục giác và đè bẹp lực lượng đối phương để vinh danh đế chế của bạn lên đỉnh bảng xếp hạng Bá chủ Vương quốc!",
    subItems: [
      { icon: <SubFameIcon />, title: "Strategic Fame" },
      { icon: <SubTerritoryIcon />, title: "Quân Lực Vương Quốc" },
      { icon: <SubAllianceIcon />, title: "Bảng Xếp Hạng" },
      { icon: <SubFameIcon />, title: "Trở thành Bá chủ" }
    ]
  }
];

export function NewbieOnboardingModal({ onClose, onConfirm, architectureId }: NewbieOnboardingModalProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const activeStep = STEPS_DATA[activeStepIndex];
  const architecture = kingdomArchitectureMeta(architectureId);

  const handlePrevStep = () => {
    setActiveStepIndex((prev) => (prev > 0 ? prev - 1 : STEPS_DATA.length - 1));
  };

  const handleNextStep = () => {
    setActiveStepIndex((prev) => (prev < STEPS_DATA.length - 1 ? prev + 1 : 0));
  };

  const handleStartNow = () => {
    if (dontShowAgain) {
      localStorage.setItem("island_empire_hide_tutorial", "true");
    }
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <div className="onboarding-guide-overlay">
      <div className="onboarding-guide-modal">
        
        {/* Header Bar */}
        <div className="guide-modal-header">
          <div className="header-title-wrap">
            <OpenBookLaurelIcon />
            <div className="title-text-group">
              <h2 className="title">✧ HƯỚNG DẪN TÂN VƯƠNG ✧</h2>
              <p className="subtitle">Nắm vững 5 bước cơ bản để xây dựng đế chế hùng mạnh!</p>
            </div>
          </div>

          <button type="button" className="guide-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Main Body (Left Steps List + Right Detail Preview Area) */}
        <div className="guide-modal-body">
          
          {/* Left Column: 5 Steps Interactive Selector Bar */}
          <div className="guide-steps-sidebar">
            {STEPS_DATA.map((step, idx) => {
              const isActive = idx === activeStepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`guide-step-card ${isActive ? "active" : ""}`}
                  onClick={() => setActiveStepIndex(idx)}
                >
                  <div
                    className="step-number-badge"
                    style={{
                      borderColor: step.badgeBorder,
                      background: isActive ? step.badgeColor : "rgba(30, 41, 59, 0.8)",
                      color: isActive ? "#0f172a" : step.badgeColor
                    }}
                  >
                    {step.id}
                  </div>

                  <div className="step-icon-wrap">{step.icon}</div>

                  <div className="step-text-wrap">
                    <span className="step-title">{step.title}</span>
                    <span className="step-desc">{step.shortDesc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Step Artwork Detail View */}
          <div className="guide-detail-area">
            {/* Top Artwork Preview Box */}
            <div className="guide-artwork-box">
              <div className="guide-nation-artwork" aria-label={`Bộ công trình ${architecture.name}`}>
                <KingdomBuildingSprite architectureId={architecture.id} buildingType="capital" className="guide-capital-sprite" />
                <KingdomBuildingSprite architectureId={architecture.id} buildingType="district" className="guide-district-sprite" />
                <KingdomBuildingSprite architectureId={architecture.id} buildingType="flag" className="guide-flag-sprite" />
                <strong>{architecture.name}</strong>
              </div>

              {/* Top Left Floating Blue Crest Badge */}
              <div className="artwork-crest-badge">
                <AssetIcon asset="crown" size={24} />
              </div>
            </div>

            {/* Step Heading & Rich Description */}
            <div className="guide-detail-content">
              <h3 className="detail-title">{activeStep.detailTitle}</h3>
              <p className="detail-desc">{activeStep.detailDesc}</p>

              {/* 4 Sub-Action Feature Grid */}
              <div className="guide-sub-grid">
                {activeStep.subItems.map((sub, sIdx) => (
                  <div key={sIdx} className="sub-item-card">
                    <div className="sub-icon">{sub.icon}</div>
                    <span className="sub-title">{sub.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="guide-pagination-bar">
              <button type="button" className="nav-arrow-btn" onClick={handlePrevStep} title="Trang trước">
                ❮
              </button>

              <div className="indicator-dots">
                {STEPS_DATA.map((_, dIdx) => (
                  <span
                    key={dIdx}
                    className={`dot ${dIdx === activeStepIndex ? "active" : ""}`}
                    onClick={() => setActiveStepIndex(dIdx)}
                  />
                ))}
              </div>

              <button type="button" className="nav-arrow-btn" onClick={handleNextStep} title="Trang sau">
                ❯
              </button>
            </div>

          </div>

        </div>

        {/* Footer Action Bar */}
        <div className="guide-modal-footer">
          <label className="dont-show-checkbox">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <span>Không hiển thị lại</span>
          </label>

          <button type="button" className="guide-start-btn" onClick={handleStartNow}>
            BẮT ĐẦU NGAY
          </button>
        </div>

      </div>
    </div>
  );
}
