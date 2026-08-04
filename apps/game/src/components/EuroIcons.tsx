import type React from "react";
import { AssetIcon } from "./AssetIcon";

type SizedIconProps = { size?: number };

const RasterIcon = ({ asset, size = 20 }: SizedIconProps & { asset: Parameters<typeof AssetIcon>[0]["asset"] }) => (
  <AssetIcon asset={asset} size={size} />
);

export const EuroBullet: React.FC<{ color?: string; size?: number }> = ({ color, size = 12 }) => (
  <AssetIcon asset="crown" size={size} style={{ filter: color ? `drop-shadow(0 1px 2px ${color})` : undefined }} />
);

export const EuroFlourishLeft: React.FC<{ color?: string }> = ({ color = "#ca8a04" }) => (
  <span aria-hidden="true" className="euro-flourish euro-flourish-left" style={{ color }} />
);

export const EuroFlourishRight: React.FC<{ color?: string }> = ({ color = "#ca8a04" }) => (
  <span aria-hidden="true" className="euro-flourish euro-flourish-right" style={{ color }} />
);

export const EuroCastleIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="castle" size={size} />;
export const EuroSettingsIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="settings" size={size} />;
export const EuroAudioIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="settingsAudio" size={size} />;
export const EuroDisplayIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="settingsDisplay" size={size} />;
export const EuroShieldIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="defender" size={size} />;
export const EuroScrollIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="scroll" size={size} />;
export const EuroGlobeIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="map" size={size} />;
export const EuroMusicIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="settingsAudio" size={size} />;
export const EuroInfoIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="info" size={size} />;
export const EuroClockIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="settingsInfo" size={size} />;
export const EuroRefreshIcon: React.FC<SizedIconProps> = ({ size }) => <RasterIcon asset="settingsInfo" size={size} />;

export const EuroFlagVI: React.FC = () => <span className="euro-flag euro-flag-vi">VI</span>;
export const EuroFlagEN: React.FC = () => <span className="euro-flag euro-flag-en">EN</span>;

export const BattleCrestBlue: React.FC<SizedIconProps> = ({ size = 56 }) => <RasterIcon asset="attacker" size={size} />;
export const BattleCrestRed: React.FC<SizedIconProps> = ({ size = 56 }) => <RasterIcon asset="defender" size={size} />;
export const BattleVsBadge: React.FC<SizedIconProps> = ({ size = 48 }) => <RasterIcon asset="battleVs" size={size} />;
export const TroopShieldIcon: React.FC<SizedIconProps> = ({ size = 42 }) => <RasterIcon asset="troopInfantry" size={size} />;
export const TroopHorseIcon: React.FC<SizedIconProps> = ({ size = 42 }) => <RasterIcon asset="troopCavalry" size={size} />;
export const TroopCrossbowIcon: React.FC<SizedIconProps> = ({ size = 42 }) => <RasterIcon asset="troopArtillery" size={size} />;
export const TroopHelmetIcon: React.FC<SizedIconProps> = ({ size = 42 }) => <RasterIcon asset="troopTotal" size={size} />;
