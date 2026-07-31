import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

interface KingdomCreationModalProps {
  onClose: () => void;
  onConfirm: (flagColor: string, emblem: string, cityName: string) => void;
  defaultCityName?: string;
  getCastleSprite?: (flagColor: string, emblem: string) => HTMLCanvasElement | undefined;
}

const FLAG_COLORS = [
  { id: "#b4232f", name: "Đỏ Vương Triều" },
  { id: "#2459a9", name: "Lam Hoàng Gia" },
  { id: "#d39216", name: "Vàng Đế Chế" },
  { id: "#26724f", name: "Lục Tùng Lâm" },
  { id: "#6d3ca0", name: "Tím Quý Tộc" },
  { id: "#147f91", name: "Lam Bắc Hải" },
  { id: "#9a4267", name: "Đỏ Hồng Tước" },
  { id: "#566170", name: "Xám Thiết Giáp" },
];

const EMBLEMS = [
  { id: "crown", name: "Vương Miện", style: "Hoàng thành cổ điển" },
  { id: "swords", name: "Song Kiếm", style: "Pháo đài Gothic" },
  { id: "shield", name: "Khiên Thép", style: "Thành lũy kiên cố" },
  { id: "eagle", name: "Đại Bàng", style: "Điện thành đế quốc" },
  { id: "lion", name: "Sư Tử", style: "Thành trì vương thất" },
  { id: "dragon", name: "Rồng Đỏ", style: "Long thành phương Đông" },
];

function EmblemIcon({ id, className = "" }: { id: string; className?: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.1,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {id === "crown" && (
        <>
          <path {...common} d="M8 16l8 7 8-13 8 13 8-7-3 21H11L8 16z" />
          <path {...common} d="M12 31h24M14 37h20" />
          <circle cx="8" cy="14" r="2" fill="currentColor" />
          <circle cx="24" cy="8" r="2" fill="currentColor" />
          <circle cx="40" cy="14" r="2" fill="currentColor" />
        </>
      )}
      {id === "swords" && (
        <>
          <path {...common} d="M10 8l13 13-4 4L6 12 10 8zM38 8L25 21l4 4 13-13-4-4z" />
          <path {...common} d="M17 23L7 37m24-14 10 14M5 35l8 8m30-8-8 8" />
          <path {...common} d="M18 29h12" />
        </>
      )}
      {id === "shield" && (
        <>
          <path {...common} d="M24 6c6 4 11 5 16 6v10c0 11-6 17-16 21C14 39 8 33 8 22V12c5-1 10-2 16-6z" />
          <path {...common} d="M24 12v24M14 22h20" />
        </>
      )}
      {id === "eagle" && (
        <>
          <path {...common} d="M24 11l5 7 12-5-6 12 8 2-13 5-6 11-6-11-13-5 8-2-6-12 12 5 5-7z" />
          <path {...common} d="M19 18l5 6 5-6M16 34l-4 7m20-7 4 7" />
        </>
      )}
      {id === "lion" && (
        <>
          <path {...common} d="M24 7l6 4 7-1 2 7 4 6-5 5-1 9-8 1-5 5-5-5-8-1-1-9-5-5 4-6 2-7 7 1 6-4z" />
          <path {...common} d="M17 19l7-4 7 4-2 12-5 5-5-5-2-12z" />
          <path {...common} d="M20 23h1m6 0h1M21 29h6" />
        </>
      )}
      {id === "dragon" && (
        <>
          <path {...common} d="M38 9l-10 4-7-5-2 8-8 2 5 6-9 7 12-1 3 11 5-10 10 5-4-10 9-7-10-1 6-9z" />
          <path {...common} d="M18 21c6-5 12-4 15 2-4 0-7 2-9 6M29 16l5-6M15 25l-7-3" />
          <circle cx="29" cy="20" r="1.5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function KingdomCreationModal({
  onClose,
  onConfirm,
  defaultCityName = "Thành Trì Vương Quốc",
  getCastleSprite,
}: KingdomCreationModalProps) {
  const [cityName, setCityName] = useState(defaultCityName);
  const [selectedColor, setSelectedColor] = useState("#b4232f");
  const [selectedEmblem, setSelectedEmblem] = useState("crown");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    () => localStorage.getItem("island_empire_avatar") || "emperor"
  );
  const [step, setStep] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !getCastleSprite) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fix blurriness on high-DPI/Retina screens by scaling the backing store
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const displaySize = 320;

    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displaySize, displaySize);

    const sprite = getCastleSprite(selectedColor, selectedEmblem);
    if (sprite) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(sprite, 0, 0, displaySize, displaySize);
    }
  }, [selectedColor, selectedEmblem, getCastleSprite]);

  const selectedColorInfo = FLAG_COLORS.find((color) => color.id === selectedColor) || FLAG_COLORS[0];
  const selectedEmblemInfo = EMBLEMS.find((emblem) => emblem.id === selectedEmblem) || EMBLEMS[0];

  const AVATAR_LIST = [
    {
      id: "emperor", label: "Hoàng Đế", role: "Đế Vương",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><polygon points="10,2 12.5,7.5 18,8 14,12 15.5,18 10,15 4.5,18 6,12 2,8 7.5,7.5" fill="#fbbf24" stroke="#92400e" strokeWidth="1"/></svg>
    },
    {
      id: "warlord", label: "Chiến Tướng", role: "Võ Tướng",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><path d="M4 4 L16 16 M5 4 L16 4 L16 8 M4 16 L4 12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M16 4 L4 16 M4 4 L4 8 M16 12 L16 16" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
    },
    {
      id: "merchant", label: "Thương Nhân", role: "Lái Buôn",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><circle cx="10" cy="10" r="7" fill="#fbbf24" stroke="#92400e" strokeWidth="1"/><text x="10" y="14" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#92400e">$</text></svg>
    },
    {
      id: "scholar", label: "Học Giả", role: "Pháp Sư",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><polygon points="10,2 18,18 2,18" fill="none" stroke="#818cf8" strokeWidth="1.5"/><circle cx="10" cy="11" r="2" fill="#818cf8"/></svg>
    },
    {
      id: "knight", label: "Kị Sĩ", role: "Hiệp Sĩ",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><path d="M10 2 L17 6 V13 C17 17 10 19 10 19 C10 19 3 17 3 13 V6 Z" fill="none" stroke="#60a5fa" strokeWidth="1.5"/><path d="M10 7 V13 M7 10 H13" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/></svg>
    },
    {
      id: "queen", label: "Nữ Hoàng", role: "Vương Hậu",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><path d="M4 14 L4 8 L7 11 L10 5 L13 11 L16 8 L16 14 Z" fill="#f0abfc" stroke="#a21caf" strokeWidth="1"/><rect x="4" y="14" width="12" height="2" fill="#a21caf"/></svg>
    },
    {
      id: "pirate", label: "Hải Tặc", role: "Cướp Biển",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><circle cx="10" cy="8" r="5" fill="none" stroke="#94a3b8" strokeWidth="1.5"/><circle cx="8" cy="7" r="1" fill="#94a3b8"/><circle cx="12" cy="7" r="1" fill="#94a3b8"/><path d="M7 11 Q10 14 13 11" stroke="#94a3b8" strokeWidth="1.5" fill="none"/><path d="M5 15 L15 16 M6 17 L14 16" stroke="#94a3b8" strokeWidth="1.5"/></svg>
    },
    {
      id: "nomad", label: "Du Mục", role: "Thảo Nguyên",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><path d="M3 13 Q7 5 10 13 Q13 5 17 13" stroke="#f97316" strokeWidth="1.8" fill="none" strokeLinecap="round"/><line x1="10" y1="2" x2="10" y2="14" stroke="#f97316" strokeWidth="1.5"/></svg>
    },
    {
      id: "alchemist", label: "Giả Kim", role: "Thuật Sĩ",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><path d="M8 4 L8 10 L4 17 L16 17 L12 10 L12 4 Z" fill="none" stroke="#34d399" strokeWidth="1.5"/><line x1="7" y1="7" x2="13" y2="7" stroke="#34d399" strokeWidth="1.2"/><circle cx="10" cy="15" r="1.5" fill="#34d399"/></svg>
    },
    {
      id: "assassin", label: "Sát Thủ", role: "Bóng Tối",
      badge: <svg viewBox="0 0 20 20" className="kc-av-badge-svg"><path d="M10 3 L13 10 L18 8 L14 14 L16 18 L10 15 L4 18 L6 14 L2 8 L7 10 Z" fill="none" stroke="#e879f9" strokeWidth="1.2"/><circle cx="10" cy="11" r="1.5" fill="#e879f9"/></svg>
    },
  ];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step < 3) return;
    localStorage.setItem("island_empire_avatar", selectedAvatarId);
    onConfirm(selectedColor, selectedEmblem, cityName.trim() || "Hoàng Thành Tân Lập");
  };

  return createPortal(
    <div className="kc-backdrop" role="dialog" aria-modal="true" aria-label="Khởi tạo Hoàng Thành">
      <section className="kc-card">
        <header className="kc-header">
          <div className="kc-title-mark"><EmblemIcon id="crown" /></div>
          <div>
            <span className="kc-eyebrow">SẮC PHONG VƯƠNG QUỐC (BƯỚC {step} / 3)</span>
            <h2>Khởi Tạo Hoàng Thành</h2>
          </div>
          <button type="button" onClick={onClose} className="kc-close" aria-label="Đóng">×</button>
        </header>

        <form onSubmit={handleSubmit} className="kc-form">
          <div className="kc-preview">
            <div className="kc-preview-topline">
              <span>KIẾN TRÚC HOÀNG THÀNH</span>
              <b>{selectedEmblemInfo.style}</b>
            </div>
            <div className="kc-castle-scene">
              <div className="kc-scene-sun" />
              <div className="kc-scene-hills hill-left" />
              <div className="kc-scene-hills hill-right" />
              {getCastleSprite && <canvas ref={canvasRef} style={{ width: "320px", height: "320px", display: "block" }} />}
              <div className="kc-scene-ground" />
              <div className="kc-royal-standard" style={{ "--standard-color": selectedColor } as React.CSSProperties}>
                <span className="kc-standard-top" />
                <span className="kc-standard-cloth"><EmblemIcon id={selectedEmblem} /></span>
              </div>
            </div>
            <div className="kc-preview-identity">
              <span>HOÀNG THÀNH</span>
              <h3>{cityName.trim() || "Hoàng Thành Tân Lập"}</h3>
              <div>
                <i style={{ backgroundColor: selectedColor }} />
                {selectedColorInfo.name}
                <span>·</span>
                {selectedEmblemInfo.name}
              </div>
            </div>
          </div>

          <div className="kc-controls">
            {/* Step 1: Name and Flag Color */}
            {step === 1 && (
              <>
                {/* Section 01 — Tên thành */}
                <div className="kc-section kc-name-section">
                  <div className="kc-section-heading">
                    <span>01</span>
                    <label htmlFor="kingdom-city-name">Danh Xưng Hoàng Thành</label>
                  </div>
                  <input
                    id="kingdom-city-name"
                    type="text"
                    value={cityName}
                    onChange={(event) => setCityName(event.target.value)}
                    placeholder="Nhập tên Hoàng Thành..."
                    maxLength={24}
                    required
                    className="kc-input"
                  />
                </div>

                {/* Section 02 — Màu cờ */}
                <div className="kc-section">
                  <div className="kc-section-heading">
                    <span>02</span>
                    <label>Sắc Hiệu Vương Triều</label>
                    <b>{selectedColorInfo.name}</b>
                  </div>
                  <div className="kc-color-grid">
                    {FLAG_COLORS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        title={color.name}
                        aria-label={color.name}
                        aria-pressed={selectedColor === color.id}
                        onClick={() => setSelectedColor(color.id)}
                        className={`kc-color-choice ${selectedColor === color.id ? "selected" : ""}`}
                        style={{ "--swatch-color": color.id } as React.CSSProperties}
                      >
                        <span />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Emblem Selection */}
            {step === 2 && (
              <div className="kc-section kc-emblem-section">
                <div className="kc-section-heading">
                  <span>03</span>
                  <label>Chọn Biểu Tượng Vương Quốc</label>
                </div>
                <div className="kc-emblem-grid">
                  {EMBLEMS.map((emblem) => (
                    <button
                      key={emblem.id}
                      type="button"
                      onClick={() => setSelectedEmblem(emblem.id)}
                      aria-pressed={selectedEmblem === emblem.id}
                      className={`kc-emblem-choice ${selectedEmblem === emblem.id ? "selected" : ""}`}
                    >
                      <span className="kc-emblem-medallion">
                        <EmblemIcon id={emblem.id} />
                      </span>
                      <span className="kc-emblem-copy">
                        <b>{emblem.name}</b>
                        <small>{emblem.style}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Lord selection */}
            {step === 3 && (
              <div className="kc-section kc-avatar-section">
                <div className="kc-section-heading">
                  <span>04</span>
                  <label>Chọn Lãnh Chúa</label>
                  <b>{AVATAR_LIST.find(a => a.id === selectedAvatarId)?.role}</b>
                </div>
                <div className="kc-avatar-grid">
                  {AVATAR_LIST.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      className={`kc-avatar-option${selectedAvatarId === av.id ? " selected" : ""}`}
                      onClick={() => setSelectedAvatarId(av.id)}
                      title={`${av.label} — ${av.role}`}
                    >
                      {/* Portrait frame */}
                      <div className="kc-av-portrait">
                        <img
                          src={`/assets/avatars/${av.id}.png`}
                          alt={av.label}
                          className="kc-avatar-img"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/assets/avatars/emperor.png"; }}
                        />
                        {/* Heraldic class badge */}
                        <div className="kc-av-badge">{av.badge}</div>
                        {/* Selected glow overlay */}
                        {selectedAvatarId === av.id && <div className="kc-av-selected-ring" />}
                      </div>
                      <span className="kc-avatar-label">{av.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>{/* end kc-controls */}

          <footer className="kc-actions">
            <p>Chân dung Lãnh chúa sẽ đại diện cho Vương quốc trên bản đồ thế giới.</p>
            <div>
              {step === 1 && (
                <>
                  <button type="button" onClick={onClose} className="kc-btn kc-btn-secondary">Hủy</button>
                  <button
                    type="button"
                    onClick={() => { if (cityName.trim()) setStep(2); }}
                    className="kc-btn kc-btn-primary"
                    disabled={!cityName.trim()}
                  >
                    Kế Tiếp
                  </button>
                </>
              )}
              {step === 2 && (
                <>
                  <button type="button" onClick={() => setStep(1)} className="kc-btn kc-btn-secondary">Quay Lại</button>
                  <button type="button" onClick={() => setStep(3)} className="kc-btn kc-btn-primary">Kế Tiếp</button>
                </>
              )}
              {step === 3 && (
                <>
                  <button type="button" onClick={() => setStep(2)} className="kc-btn kc-btn-secondary">Quay Lại</button>
                  <button type="submit" className="kc-btn kc-btn-primary">Dựng Hoàng Thành</button>
                </>
              )}
            </div>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
