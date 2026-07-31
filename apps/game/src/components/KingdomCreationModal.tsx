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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !getCastleSprite) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sprite = getCastleSprite(selectedColor, selectedEmblem);
    if (sprite) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
    }
  }, [selectedColor, selectedEmblem, getCastleSprite]);

  const selectedColorInfo = FLAG_COLORS.find((color) => color.id === selectedColor) || FLAG_COLORS[0];
  const selectedEmblemInfo = EMBLEMS.find((emblem) => emblem.id === selectedEmblem) || EMBLEMS[0];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm(selectedColor, selectedEmblem, cityName.trim() || "Hoàng Thành Tân Lập");
  };

  return createPortal(
    <div className="kc-backdrop" role="dialog" aria-modal="true" aria-label="Khởi tạo Hoàng Thành">
      <section className="kc-card">
        <header className="kc-header">
          <div className="kc-title-mark"><EmblemIcon id="crown" /></div>
          <div>
            <span className="kc-eyebrow">SẮC PHONG VƯƠNG QUỐC</span>
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
              {getCastleSprite && <canvas ref={canvasRef} width={320} height={320} />}
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
                    <span className="kc-choice-check">✓</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <footer className="kc-actions">
            <p>Biểu tượng quyết định kiến trúc Hoàng Thành trên bản đồ thế giới.</p>
            <div>
              <button type="button" onClick={onClose} className="kc-btn kc-btn-secondary">Hủy</button>
              <button type="submit" className="kc-btn kc-btn-primary">Dựng Hoàng Thành</button>
            </div>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
