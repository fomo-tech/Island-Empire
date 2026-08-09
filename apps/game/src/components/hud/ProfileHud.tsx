type ProfileHudProps = {
  avatarId: string;
  avatarFrameId?: string | null;
  playerName: string;
  rank: string;
  power: number;
  powerLabel: string;
  vipLevel: number;
  onOpenProfile: () => void;
  onChangeAvatar: () => void;
};

function compact(value: number) {
  const safe = Math.max(0, Number(value) || 0);
  if (safe >= 1_000_000)
    return `${(safe / 1_000_000).toFixed(safe >= 10_000_000 ? 0 : 1)}M`;
  if (safe >= 1_000)
    return `${(safe / 1_000).toFixed(safe >= 100_000 ? 0 : 1)}K`;
  return Math.floor(safe).toLocaleString("vi-VN");
}

export function ProfileHud({
  avatarId,
  avatarFrameId = "vip",
  playerName,
  rank,
  power,
  powerLabel,
  vipLevel,
  onOpenProfile,
  onChangeAvatar,
}: ProfileHudProps) {
  const language = detectDeviceLanguage();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const frameAsset =
    {
      vip: "/assets/ui/vip-avatar-frame.webp",
      gold: "/assets/leaderboard/leaderboard_frame_gold.png",
      silver: "/assets/leaderboard/leaderboard_frame_silver.png",
      bronze: "/assets/leaderboard/leaderboard_frame_bronze.png",
      dragonfire: "/assets/cosmetics/frames/dragonfire.png",
      stormcrown: "/assets/cosmetics/frames/stormcrown.png",
      voidmoon: "/assets/cosmetics/frames/voidmoon.png",
    }[avatarFrameId || "vip"];

  return (
    <section className="rok-ref-profile" aria-label={t("playerProfile")}>
      <button
        type="button"
        className="rok-ref-avatar"
        onClick={onChangeAvatar}
        title={t("changeAvatar")}
      >
        <img
          className="rok-ref-avatar-portrait"
          src={`/assets/avatars/${avatarId}.png`}
          alt={t("playerAvatar")}
          onError={(event) => {
            event.currentTarget.src = "/assets/avatars/emperor.png";
          }}
        />
        <img className="rok-ref-avatar-frame" src={frameAsset || "/assets/ui/vip-avatar-frame.webp"} alt="" aria-hidden="true" />
      </button>

      <div className="rok-ref-profile-info">
        <button
          type="button"
          className="rok-ref-power"
          onClick={onOpenProfile}
          title={`${playerName}: ${powerLabel}`}
        >
          <img src="/assets/icons/icons-button/attack.png" alt="" />
          {compact(Math.round(power))}
        </button>
        <div className="rok-ref-vip" title={t("currentVipLevel")}>
          <img src="/assets/ui/profile-vip-shield.webp" alt="" />
          <strong>VIP {vipLevel}</strong>
          <span aria-hidden="true">›</span>
        </div>
        <time className="rok-ref-time">
          UTC{" "}
          {new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          })}
        </time>
      </div>
    </section>
  );
}
import { detectDeviceLanguage, translate } from "../../game/i18n";
