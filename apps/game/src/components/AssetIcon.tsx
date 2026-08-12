import type { CSSProperties } from "react";

/**
 * Single raster icon entry point for UI. Keeping icon rendering here prevents
 * inline SVG markup from being duplicated across every modal and keeps the
 * asset dimensions stable on desktop and mobile.
 */
export const ICON_ASSETS = {
  food: "/assets/icons/resource_food_european.png",
  wood: "/assets/icons/resource_wood_european.png",
  stone: "/assets/icons/resource_stone_european.png",
  iron: "/assets/icons/resource_iron_european.png",
  gems: "/assets/icons/resource_gems_european.png",
  gold: "/assets/icons/resource_gold_european.png",
  coal: "/assets/icons/resource_coal_european.png",
  sulfur: "/assets/icons/resource_sulfur_european.png",
  troopInfantry: "/assets/icon-troops/sprite_01.webp",
  troopTotal: "/assets/icon-troops/sprite_02.webp",
  troopCavalry: "/assets/icon-troops/sprite_03.webp",
  troopArtillery: "/assets/icon-troops/sprite_04.webp",
  castle: "/assets/icons/icon_tower.png",
  city: "/assets/icons/icon_tower.png",
  military: "/assets/icons/icon_military.png",
  garrison: "/assets/icon-troops/sprite_01.webp",
  march: "/assets/icons/icons-button/attack.png",
  capacity: "/assets/icon-troops/sprite_02.webp",
  army: "/assets/icons/menu/troop.png",
  search: "/assets/icons/icon_search_european.png",
  filter: "/assets/icons/menu/setting.png",
  chart: "/assets/icons/menu/report.png",
  chest: "/assets/icons/icon_chest.png",
  shop: "/assets/icons/menu/store.png",
  map: "/assets/icons/icon_map.png",
  scroll: "/assets/icons/icon_scroll.png",
  settings: "/assets/icons/menu/setting.png",
  settingsAudio: "/assets/icons/icon_settings_audio.png",
  settingsDisplay: "/assets/icons/icon_settings_display.png",
  settingsAccount: "/assets/icons/icon_settings_account.png",
  settingsInfo: "/assets/icons/icon_settings_info.png",
  battleVs: "/assets/icons/icon_battle_vs.png",
  attacker: "/assets/icons/icon_attacker_lion_shield.png",
  defender: "/assets/icons/icon_defender_dragon_shield.png",
  attackButton: "/assets/icons/icons-button/attack.png",
  buildButton: "/assets/icons/icons-button/build.png",
  manageButton: "/assets/icons/icons-button/manage.png",
  bag: "/assets/icons/icon_bag.png",
  guild: "/assets/icons/menu/ peaceful_borders.png",
  mail: "/assets/icons/menu/letter.png",
  event: "/assets/icons/menu/envent.png",
  close: "/assets/icons/menu/close.png",
  crown: "/assets/icons/icon_gold_crown.png",
  info: "/assets/icons/icon_settings_info.png",
} as const;

export type IconAssetId = keyof typeof ICON_ASSETS;

type AssetIconProps = {
  asset: IconAssetId | string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  active?: boolean;
};

export function AssetIcon({
  asset,
  size = 20,
  className,
  style,
  alt = "",
  active = true,
}: AssetIconProps) {
  const src = asset in ICON_ASSETS ? ICON_ASSETS[asset as IconAssetId] : asset;

  return (
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      decoding="async"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
        opacity: active ? 1 : 0.52,
        ...style,
      }}
    />
  );
}
