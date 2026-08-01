import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";

interface KingdomCreationModalProps {
  onClose: () => void;
  onConfirm: (flagColor: string, emblem: string, cityName: string) => void | Promise<void>;
  defaultCityName?: string;
  territoryName?: string;
  checkName: (cityName: string) => Promise<{ available: boolean; message: string }>;
  getCastleSprite?: (flagColor: string, emblem: string) => HTMLCanvasElement | undefined;
}

const FLAG_COLORS = [
  { id: "#b4232f", name: "Đỏ Vương Triều" }, { id: "#2459a9", name: "Lam Hoàng Gia" },
  { id: "#d39216", name: "Vàng Đế Chế" }, { id: "#26724f", name: "Lục Tùng Lâm" },
  { id: "#6d3ca0", name: "Tím Quý Tộc" }, { id: "#147f91", name: "Lam Bắc Hải" },
  { id: "#9a4267", name: "Đỏ Hồng Tước" }, { id: "#566170", name: "Xám Thiết Giáp" },
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
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 2.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    {id === "crown" && <><path {...line} d="M8 16l8 7 8-13 8 13 8-7-3 21H11L8 16z"/><path {...line} d="M12 31h24M14 37h20"/><circle cx="8" cy="14" r="2" fill="currentColor"/><circle cx="24" cy="8" r="2" fill="currentColor"/><circle cx="40" cy="14" r="2" fill="currentColor"/></>}
    {id === "swords" && <><path {...line} d="M10 8l13 13-4 4L6 12 10 8zM38 8L25 21l4 4 13-13-4-4z"/><path {...line} d="M17 23L7 37m24-14 10 14M5 35l8 8m30-8-8 8"/><path {...line} d="M18 29h12"/></>}
    {id === "shield" && <><path {...line} d="M24 6c6 4 11 5 16 6v10c0 11-6 17-16 21C14 39 8 33 8 22V12c5-1 10-2 16-6z"/><path {...line} d="M24 12v24M14 22h20"/></>}
    {id === "eagle" && <><path {...line} d="M24 11l5 7 12-5-6 12 8 2-13 5-6 11-6-11-13-5 8-2-6-12 12 5 5-7z"/><path {...line} d="M19 18l5 6 5-6M16 34l-4 7m20-7 4 7"/></>}
    {id === "lion" && <><path {...line} d="M24 7l6 4 7-1 2 7 4 6-5 5-1 9-8 1-5 5-5-5-8-1-1-9-5-5 4-6 2-7 7 1 6-4z"/><path {...line} d="M17 19l7-4 7 4-2 12-5 5-5-5-2-12z"/><path {...line} d="M20 23h1m6 0h1M21 29h6"/></>}
    {id === "dragon" && <><path {...line} d="M38 9l-10 4-7-5-2 8-8 2 5 6-9 7 12-1 3 11 5-10 10 5-4-10 9-7-10-1 6-9z"/><path {...line} d="M18 21c6-5 12-4 15 2-4 0-7 2-9 6M29 16l5-6M15 25l-7-3"/><circle cx="29" cy="20" r="1.5" fill="currentColor"/></>}
  </svg>;
}

export function KingdomCreationModal({ onClose, onConfirm, defaultCityName = "Hoàng Thành Tân Lập", territoryName = "Lãnh địa đã chọn", checkName, getCastleSprite }: KingdomCreationModalProps) {
  const [stage, setStage] = useState<2 | 3>(2);
  const [cityName, setCityName] = useState(defaultCityName);
  const [selectedColor, setSelectedColor] = useState(FLAG_COLORS[0].id);
  const [selectedEmblem, setSelectedEmblem] = useState(EMBLEMS[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [nameMessage, setNameMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedColorInfo = FLAG_COLORS.find((item) => item.id === selectedColor)!;
  const selectedEmblemInfo = EMBLEMS.find((item) => item.id === selectedEmblem)!;

  useEffect(() => {
    const canvas = canvasRef.current;
    const sprite = getCastleSprite?.(selectedColor, selectedEmblem);
    if (!canvas || !sprite) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr; canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sprite, 0, 0, size, size);
  }, [selectedColor, selectedEmblem, getCastleSprite, stage]);

  useEffect(() => {
    const value = cityName.trim();
    if (value.length < 3) { setNameStatus("idle"); setNameMessage("Tên thành cần ít nhất 3 ký tự"); return; }
    setNameStatus("checking");
    let active = true;
    const timer = window.setTimeout(() => void checkName(value).then((result) => {
      if (!active) return;
      setNameStatus(result.available ? "available" : "taken"); setNameMessage(result.message);
    }).catch(() => { if (active) { setNameStatus("taken"); setNameMessage("Không thể kiểm tra tên thành"); } }), 450);
    return () => { active = false; window.clearTimeout(timer); };
  }, [cityName, checkName]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (stage === 2) { if (nameStatus === "available") setStage(3); return; }
    if (submitting) return;
    setSubmitting(true);
    try { await onConfirm(selectedColor, selectedEmblem, cityName.trim()); } finally { setSubmitting(false); }
  };

  const preview = <div className={`founding-preview-card ${stage === 3 ? "complete" : ""}`}>
    <div className="founding-preview-label"><span>{stage === 3 ? "HOÀNG THÀNH HOÀN THIỆN" : "KIẾN TRÚC HOÀNG THÀNH"}</span><b>{selectedEmblemInfo.style}</b></div>
    <div className="founding-castle-scene">
      <div className="founding-castle-aura" />
      <div className="founding-castle-plinth" />
      <canvas ref={canvasRef}/>
    </div>
    <div className="founding-preview-info"><EmblemIcon id={selectedEmblem}/><div><small>HOÀNG THÀNH</small><strong>{cityName.trim() || defaultCityName}</strong><span>{territoryName} · {selectedColorInfo.name}</span></div></div>
  </div>;

  return createPortal(<div className="founding-backdrop" role="dialog" aria-modal="true" aria-label="Dựng Hoàng Thành">
    <section className="founding-card">
      <header className="founding-header"><div className="founding-title-mark"><img src="/assets/icons/icon_gold_crown.png" alt=""/></div><div><span>SẮC LỆNH KIẾN QUỐC</span><h2>Dựng Hoàng Thành Tân Thủ</h2></div><button type="button" onClick={onClose} className="founding-close" aria-label="Đóng cửa sổ"><i/><i/></button></header>
      <div className="founding-progress"><div className="done"><span>01</span><b>Lãnh địa</b></div><i/><div className={stage === 2 ? "active" : "done"}><span>02</span><b>Hoàng Thành</b></div><i/><div className={stage === 3 ? "active" : ""}><span>03</span><b>Hoàn thành</b></div></div>
      <form className="founding-body" onSubmit={submit}>
        {preview}
        <div className="founding-panel">{stage === 2 ? <>
          <div className="founding-section"><label htmlFor="founding-name"><span>01</span> Danh xưng Hoàng Thành</label><div className={`founding-name-input status-${nameStatus}`}><input id="founding-name" value={cityName} onChange={(event) => setCityName(event.target.value)} maxLength={24} required/><small>{cityName.length}/24</small></div><p className={`founding-name-status ${nameStatus}`}>{nameStatus === "checking" ? "ĐANG KIỂM TRA TÊN THÀNH" : nameMessage}</p></div>
          <div className="founding-section"><label><span>02</span> Sắc hiệu Vương Triều <b>{selectedColorInfo.name}</b></label><div className="founding-colors">{FLAG_COLORS.map((color) => <button key={color.id} type="button" aria-label={color.name} aria-pressed={selectedColor === color.id} className={selectedColor === color.id ? "selected" : ""} onClick={() => setSelectedColor(color.id)} style={{ "--color": color.id } as CSSProperties}><i/></button>)}</div></div>
          <div className="founding-section"><label><span>03</span> Biểu tượng Vương Quốc <b>{selectedEmblemInfo.name}</b></label><div className="founding-emblems">{EMBLEMS.map((emblem) => <button key={emblem.id} type="button" aria-label={emblem.name} aria-pressed={selectedEmblem === emblem.id} className={selectedEmblem === emblem.id ? "selected" : ""} onClick={() => setSelectedEmblem(emblem.id)}><EmblemIcon id={emblem.id}/><small>{emblem.name}</small></button>)}</div></div>
        </> : <div className="founding-complete"><EmblemIcon id={selectedEmblem}/><span>SẮC LỆNH ĐÃ SẴN SÀNG</span><h3>{cityName}</h3><p>Kiểm tra lần cuối trước khi dựng thành tại <b>{territoryName}</b>.</p><dl><div><dt>Sắc hiệu</dt><dd>{selectedColorInfo.name}</dd></div><div><dt>Biểu tượng</dt><dd>{selectedEmblemInfo.name}</dd></div></dl></div>}</div>
        <footer className="founding-actions"><p>{stage === 2 ? "Xem trước cập nhật trực tiếp theo lựa chọn của bạn." : "Xác nhận để dựng Hoàng Thành trên lãnh địa đã chọn."}</p><div>{stage === 3 && <button type="button" className="secondary" onClick={() => setStage(2)} disabled={submitting}>QUAY LẠI</button>}<button type="submit" className="primary" disabled={submitting || nameStatus !== "available"}>{submitting ? "ĐANG DỰNG THÀNH" : stage === 2 ? "XEM HOÀN THÀNH" : "DỰNG HOÀNG THÀNH"}</button></div></footer>
      </form>
    </section>
  </div>, document.body);
}
