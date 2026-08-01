import type { ResourceBag, ResourceKey } from "@island/shared";

export const RESOURCE_ORDER: ResourceKey[] = [
  "food",
  "wood",
  "stone",
  "gold",
  "gems",
];

export const RESOURCE_META: Record<
  ResourceKey,
  { label: string; shortLabel: string; icon: string; purpose: string }
> = {
  food: { label: "Lương thực", shortLabel: "Lương", icon: "/assets/icons/resource_food_european.png", purpose: "Bổ sung bộ binh, kị binh và xây dựng lãnh thổ." },
  wood: { label: "Gỗ", shortLabel: "Gỗ", icon: "/assets/icons/resource_wood_european.png", purpose: "Dùng cho bộ binh, kị binh và xây dựng." },
  stone: { label: "Đá", shortLabel: "Đá", icon: "/assets/icons/resource_stone_european.png", purpose: "Xây công trình và bổ sung pháo binh." },
  gold: { label: "Vàng", shortLabel: "Vàng", icon: "/assets/icons/resource_gold_european.png", purpose: "Dùng để tuyển quân, xây dựng và giao dịch." },
  gems: { label: "Ngọc", shortLabel: "Ngọc", icon: "/assets/icons/resource_gems_european.png", purpose: "Dùng trong cửa hàng và các dịch vụ cao cấp." },
};

export function ResourceIcon({ resource, className = "" }: { resource: ResourceKey; className?: string }) {
  const meta = RESOURCE_META[resource];
  const isPremium = resource === "gems";
  return <img className={className} src={meta.icon} alt={meta.label} />;
}

function exact(value: number) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("vi-VN");
}

function compact(value: number) {
  const safe = Math.max(0, Number(value) || 0);
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(safe >= 10_000_000 ? 0 : 1)}M`;
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(safe >= 100_000 ? 0 : 1)}K`;
  return Math.floor(safe).toLocaleString("vi-VN");
}

export function ResourceHudItem({
  resource,
  value,
  capacity,
  ratePerHour,
  connected,
  onAdd,
}: {
  resource: ResourceKey;
  value: number;
  capacity: number;
  ratePerHour: number;
  connected: boolean;
  onAdd?: () => void;
}) {
  const meta = RESOURCE_META[resource];
  const isPremium = resource === "gems";
  const remaining = Math.max(0, capacity - value);
  const percent = capacity > 0 ? Math.min(100, (value / capacity) * 100) : 0;
  const full = !isPremium && capacity > 0 && value >= capacity;
  const nearFull = !full && percent >= 90;
  const secondsToFull = ratePerHour > 0 ? (remaining / ratePerHour) * 3600 : 0;
  const fullEstimate = full
    ? "Kho đã đầy"
    : ratePerHour <= 0
      ? "Không có sản lượng"
      : secondsToFull < 3600
        ? `${Math.max(1, Math.ceil(secondsToFull / 60))} phút nữa đầy`
        : `${Math.floor(secondsToFull / 3600)} giờ ${Math.ceil((secondsToFull % 3600) / 60)} phút nữa đầy`;

  return (
    <div tabIndex={0} aria-label={`${meta.label}: ${exact(value)}${isPremium ? "" : ` trên ${exact(capacity)}`}`} className={`hud-resource-entry res-${resource}${full ? " is-full" : nearFull ? " is-near-full" : ""}`}>
      <ResourceIcon resource={resource} className="hud-resource-entry-icon" />
      <span className="hud-resource-entry-copy">
        <strong>{isPremium ? compact(value) : `${compact(value)}/${compact(capacity)}`}</strong>
        <small>{ratePerHour > 0 ? `+${compact(ratePerHour)}/h` : isPremium ? "Đặc biệt" : "0/h"}</small>
      </span>
      {onAdd && <button type="button" className="hud-res-add-btn rok-add-btn" onClick={onAdd} aria-label={`Mua ${meta.label}`}>+</button>}
      <div className="hud-resource-tooltip" role="tooltip">
        <header><ResourceIcon resource={resource} /><strong>{meta.label}</strong></header>
        <dl>
          <div><dt>Hiện có</dt><dd>{exact(value)}</dd></div>
          {!isPremium && <div><dt>Giới hạn</dt><dd>{exact(capacity)}</dd></div>}
          {!isPremium && <div><dt>Còn trống</dt><dd>{exact(remaining)}</dd></div>}
          <div><dt>Sản lượng</dt><dd>+{exact(ratePerHour)}/giờ</dd></div>
        </dl>
        {!isPremium && <p className={full ? "danger" : nearFull ? "warning" : ""}>{connected ? fullEstimate : "Đang chờ đồng bộ server"}</p>}
        {isPremium && <p>{connected ? "Chỉ có ở Mỏ Ngọc hiếm hoặc cửa hàng" : "Đang chờ đồng bộ server"}</p>}
      </div>
    </div>
  );
}

export function resourceBagValue(bag: Partial<ResourceBag> | undefined, key: ResourceKey) {
  return Math.max(0, Number(bag?.[key]) || 0);
}
