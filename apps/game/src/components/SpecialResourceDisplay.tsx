export type SpecialResourceMeta = {
  label: string;
  icon: string;
  mapAsset: string;
  effect: string;
  guide: string;
  tone: "cavalry" | "artillery" | "naval" | "gem";
};

export const SPECIAL_RESOURCE_META: Record<string, SpecialResourceMeta> = {
  "Bãi ngựa": {
    label: "Bãi ngựa",
    icon: "/assets/special/special_horse_pasture_icon.png",
    mapAsset: "/assets/special/special_horse_pasture.png",
    effect: "Bổ sung kị binh",
    guide: "Lãnh thổ chuyên nuôi chiến mã; chỉ bổ sung kị binh.",
    tone: "cavalry",
  },
  "Xưởng rèn": {
    label: "Xưởng rèn",
    icon: "/assets/special/special_forge_icon.png",
    mapAsset: "/assets/special/special_forge.png",
    effect: "Bổ sung pháo binh",
    guide: "Lò rèn quân giới; chỉ bổ sung pháo binh.",
    tone: "artillery",
  },
  "Bến tàu tự nhiên": {
    label: "Bến tàu tự nhiên",
    icon: "/assets/special/special_harbor_icon.png",
    mapAsset: "/assets/special/special_harbor.png",
    effect: "Mở tuyến hành quân biển",
    guide: "Cho phép xuất quân và tiếp tế qua đường biển.",
    tone: "naval",
  },
  "Mỏ Ngọc": {
    label: "Mỏ Ngọc",
    icon: "/assets/special/special_gem_mine_icon.png",
    mapAsset: "/assets/special/special_gem_mine.png",
    effect: "Sinh Ngọc hiếm",
    guide: "Nguồn Ngọc tự nhiên cực hiếm; Ngọc không giới hạn kho.",
    tone: "gem",
  },
};

const SPECIAL_ALIASES: Record<string, keyof typeof SPECIAL_RESOURCE_META> = {
  "xưởng pháo": "Xưởng rèn",
  "xưởng đúc pháo": "Xưởng rèn",
  "mỏ đá quý": "Mỏ Ngọc",
};

export function getSpecialResourceMeta(rawName: string): SpecialResourceMeta | null {
  const clean = rawName.replace(/^[^\w\s\u00C0-\u024F\u1EA0-\u1EFF]+/g, "").trim();
  const exact = SPECIAL_RESOURCE_META[clean];
  if (exact) return exact;
  const alias = SPECIAL_ALIASES[clean.toLowerCase()];
  return alias ? SPECIAL_RESOURCE_META[alias] : null;
}

export function SpecialResourceIcon({ name, className = "" }: { name: string; className?: string }) {
  const meta = getSpecialResourceMeta(name);
  if (!meta) return <span className={`special-resource-fallback ${className}`} aria-hidden="true">◆</span>;
  return <img className={className} src={meta.icon} alt="" aria-hidden="true" />;
}
