import React from "react";

// European RTS Gold Filigree Star Bullet
export const EuroBullet: React.FC<{ color?: string; size?: number }> = ({ color = "#ffd700", size = 12 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" fill={color} stroke="#78350f" strokeWidth="1.2" />
    <circle cx="12" cy="12" r="3" fill="#fff2a3" />
  </svg>
);

// European Header Filigree Ornaments
export const EuroFlourishLeft: React.FC<{ color?: string }> = ({ color = "#ca8a04" }) => (
  <svg viewBox="0 0 40 16" width="32" height="14" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M 0 8 C 10 2, 20 14, 30 8 C 34 5, 38 8, 40 8" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="36" cy="8" r="2.5" fill={color} />
  </svg>
);

export const EuroFlourishRight: React.FC<{ color?: string }> = ({ color = "#ca8a04" }) => (
  <svg viewBox="0 0 40 16" width="32" height="14" style={{ display: "inline-block", verticalAlign: "middle", transform: "scaleX(-1)" }}>
    <path d="M 0 8 C 10 2, 20 14, 30 8 C 34 5, 38 8, 40 8" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="36" cy="8" r="2.5" fill={color} />
  </svg>
);

// European Castle & Crown Emblem
export const EuroCastleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M8 56V24l12-8 12 8 12-8 12 8v32H8z" fill="#1e293b" stroke="#ffd700" strokeWidth="3.5" />
    <path d="M14 24h8v32h-8zM42 24h8v32h-8z" fill="#0f172a" stroke="#ca8a04" strokeWidth="2" />
    <path d="M26 14h12v42H26z" fill="#334155" stroke="#ffd700" strokeWidth="2" />
    <path d="M30 42v14h4V42c0-3-4-3-4 0z" fill="#ffd700" />
    <path d="M32 6l6 8h-12z" fill="#b91c1c" stroke="#fef08a" strokeWidth="1.5" />
  </svg>
);

// European RTS Gear & Filigree Icon
export const EuroSettingsIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <circle cx="32" cy="32" r="22" fill="#1e293b" stroke="#ffd700" strokeWidth="3" />
    <path d="M32 6v8M32 50v8M6 32h8M50 32h8M13.6 13.6l5.7 5.7M44.7 44.7l5.7 5.7M13.6 50.4l5.7-5.7M44.7 19.3l5.7-5.7" stroke="#ffd700" strokeWidth="4" strokeLinecap="round" />
    <circle cx="32" cy="32" r="10" fill="#0f172a" stroke="#fef08a" strokeWidth="2.5" />
  </svg>
);

// European Horn Audio Icon
export const EuroAudioIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M12 24h12l16-14v44l-16-14H12V24z" fill="#1e3a8a" stroke="#ffd700" strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M48 22c4 4 4 16 0 20M56 16c8 8 8 24 0 32" fill="none" stroke="#fef08a" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

// European Display & Monitor Icon
export const EuroDisplayIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <rect x="8" y="10" width="48" height="34" rx="4" fill="#0f172a" stroke="#ffd700" strokeWidth="3.5" />
    <path d="M24 54h16M32 44v10" stroke="#ca8a04" strokeWidth="4" strokeLinecap="round" />
    <polygon points="16,18 48,18 48,36 16,36" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1.5" />
  </svg>
);

// European Knight Shield Icon
export const EuroShieldIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M32 6L54 14C54 42 32 58 32 58C32 58 10 42 10 14L32 6Z" fill="#1e1b4b" stroke="#ffd700" strokeWidth="3.5" />
    <path d="M32 10L48 16C48 38 32 52 32 52C32 52 16 38 16 16L32 10Z" fill="#b91c1c" />
    <path d="M32 16v32M18 32h28" stroke="#fef08a" strokeWidth="2.5" />
  </svg>
);

// European Royal Parchment Scroll Icon
export const EuroScrollIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M12 14c-4 0-6 3-6 6s2 6 6 6h40c4 0 6-3 6-6s-2-6-6-6H12z" fill="#ca8a04" stroke="#ffd700" strokeWidth="2" />
    <path d="M10 26v24c0 4 3 6 6 6h36c4 0 6-2 6-6V26H10z" fill="#fef08a" stroke="#ca8a04" strokeWidth="3" />
    <path d="M18 34h28M18 42h20M18 50h24" stroke="#854d0e" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// European Globe & Armillary Icon
export const EuroGlobeIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <circle cx="32" cy="32" r="22" fill="#0f172a" stroke="#ffd700" strokeWidth="3.5" />
    <ellipse cx="32" cy="32" rx="22" ry="9" fill="none" stroke="#ca8a04" strokeWidth="2.5" />
    <path d="M32 10v44M10 32h44" stroke="#ca8a04" strokeWidth="2.5" />
  </svg>
);

// European Lyre / Music Note Icon
export const EuroMusicIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M18 48c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8z" fill="#ffd700" stroke="#ca8a04" strokeWidth="2" />
    <path d="M34 48V16l20-6v32" fill="none" stroke="#ffd700" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M38 42c0-4 4-7 8-7s8 3 8 7-4 7-8 7-8-3-8-7z" fill="#ffd700" stroke="#ca8a04" strokeWidth="2" />
  </svg>
);

// European Laurel Info Badge
export const EuroInfoIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <circle cx="32" cy="32" r="22" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="3.5" />
    <circle cx="32" cy="20" r="3.5" fill="#ffffff" />
    <rect x="29" y="28" width="6" height="18" rx="3" fill="#ffffff" />
  </svg>
);

// European Hourglass Clock Icon
export const EuroClockIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M16 10h32M16 54h32" stroke="#ffd700" strokeWidth="4" strokeLinecap="round" />
    <path d="M18 10l14 20-14 24h28L32 30l14-20H18z" fill="#1c140e" stroke="#ca8a04" strokeWidth="3" strokeLinejoin="round" />
    <polygon points="26,48 38,48 32,38" fill="#facc15" />
  </svg>
);

// European Refresh Arrow Icon
export const EuroRefreshIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M52 32c0 11-9 20-20 20S12 43 12 32 21 12 32 12c6 0 11.5 2.5 15.5 6.5L52 14" fill="none" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    <polygon points="52,10 52,24 38,24" fill="#ffffff" />
  </svg>
);

// European Flag Badges
export const EuroFlagVI: React.FC = () => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "24px",
      height: "16px",
      backgroundColor: "#da251d",
      border: "1px solid #ffd700",
      borderRadius: "3px",
      fontSize: "10px",
      fontWeight: 900,
      color: "#ffff00",
      boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
    }}
  >
    VI
  </span>
);

export const EuroFlagEN: React.FC = () => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "24px",
      height: "16px",
      backgroundColor: "#00247d",
      border: "1px solid #ffd700",
      borderRadius: "3px",
      fontSize: "10px",
      fontWeight: 900,
      color: "#ffffff",
      boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
    }}
  >
    EN
  </span>
);

// ==========================================================================
// BATTLE REPORT DESIGN ICONS & CRESTS
// ==========================================================================

// Attacker Blue Crest Shield with Gold Lion
export const BattleCrestBlue: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <svg viewBox="0 0 80 96" width={size} height={(size * 96) / 80} style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.9))" }}>
    {/* Crown Header */}
    <path d="M 28 8 L 34 16 L 40 4 L 46 16 L 52 8 L 50 20 L 30 20 Z" fill="#ffd700" stroke="#854d0e" strokeWidth="2" />
    <circle cx="40" cy="12" r="3" fill="#ef4444" />
    {/* Outer Gold Shield */}
    <path d="M 12 20 L 68 20 C 68 62, 40 88, 40 88 C 40 88, 12 62, 12 20 Z" fill="#ca8a04" stroke="#ffd700" strokeWidth="3" />
    {/* Inner Blue Shield */}
    <path d="M 17 25 L 63 25 C 63 58, 40 81, 40 81 C 40 81, 17 58, 17 25 Z" fill="url(#blueShieldGrad)" stroke="#1d4ed8" strokeWidth="2" />
    {/* Golden Lion Motif */}
    <path d="M 38 34 C 44 32, 48 36, 48 40 C 48 44, 44 46, 46 50 C 48 54, 52 56, 48 62 C 44 68, 38 66, 36 62 C 34 58, 36 52, 34 46 C 32 42, 34 36, 38 34 Z" fill="#ffd700" stroke="#78350f" strokeWidth="1.5" />
    <path d="M 44 38 L 52 36 M 46 42 L 54 44" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="blueShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
  </svg>
);

// Defender Red Crest Shield with Gold Dragon
export const BattleCrestRed: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <svg viewBox="0 0 80 96" width={size} height={(size * 96) / 80} style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.9))" }}>
    {/* Crown Header */}
    <path d="M 28 8 L 34 16 L 40 4 L 46 16 L 52 8 L 50 20 L 30 20 Z" fill="#ffd700" stroke="#854d0e" strokeWidth="2" />
    <circle cx="40" cy="12" r="3" fill="#2563eb" />
    {/* Outer Gold Shield */}
    <path d="M 12 20 L 68 20 C 68 62, 40 88, 40 88 C 40 88, 12 62, 12 20 Z" fill="#ca8a04" stroke="#ffd700" strokeWidth="3" />
    {/* Inner Red Shield */}
    <path d="M 17 25 L 63 25 C 63 58, 40 81, 40 81 C 40 81, 17 58, 17 25 Z" fill="url(#redShieldGrad)" stroke="#b91c1c" strokeWidth="2" />
    {/* Golden Dragon Motif */}
    <path d="M 36 36 C 42 32, 50 36, 46 44 C 44 48, 52 52, 48 60 C 44 66, 36 64, 34 58 C 32 54, 38 48, 36 44 C 34 40, 32 38, 36 36 Z" fill="#ffd700" stroke="#78350f" strokeWidth="1.5" />
    <path d="M 46 40 Q 56 42 54 50" fill="none" stroke="#ffd700" strokeWidth="2" />
    <defs>
      <linearGradient id="redShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>
    </defs>
  </svg>
);

// 3D Metallic Gold VS Emblem Badge
export const BattleVsBadge: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.9))" }}>
    <circle cx="32" cy="32" r="28" fill="url(#vsGoldGrad)" stroke="#ffd700" strokeWidth="3" />
    <circle cx="32" cy="32" r="22" fill="#1c1308" stroke="#ca8a04" strokeWidth="2" />
    <text x="32" y="38" textAnchor="middle" fill="#ffd700" fontFamily="Cinzel, serif" fontSize="22" fontWeight="900" style={{ fontStyle: "italic", textShadow: "0 2px 4px #000" }}>
      VS
    </text>
    <defs>
      <linearGradient id="vsGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffd700" />
        <stop offset="50%" stopColor="#ca8a04" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
    </defs>
  </svg>
);

// Troop Type 1: Infantry Blue Hexagon Badge (Bộ Binh)
export const TroopShieldIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
    <polygon points="32,8 54,20 54,44 32,56 10,44 10,20" fill="url(#infantryGrad)" stroke="#1d4ed8" strokeWidth="1.5" />
    <path d="M32 18L46 24V38C46 44 32 50 32 50C32 50 18 44 18 38V24L32 18Z" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
    <defs>
      <linearGradient id="infantryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e3a8a" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>
  </svg>
);

// Troop Type 2: Cavalry Gold Hexagon Horse Badge (Kỵ Binh)
export const TroopHorseIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" fill="#291e0b" stroke="#f59e0b" strokeWidth="3" />
    <polygon points="32,8 54,20 54,44 32,56 10,44 10,20" fill="url(#cavalryGrad)" stroke="#d97706" strokeWidth="1.5" />
    <path d="M22 42C22 36 26 30 32 24C36 20 40 18 44 18C44 24 40 28 38 32C42 32 46 36 44 42C40 46 32 44 28 44Z" fill="#ffd700" stroke="#78350f" strokeWidth="2" />
    <defs>
      <linearGradient id="cavalryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="100%" stopColor="#1c1308" />
      </linearGradient>
    </defs>
  </svg>
);

// Troop Type 3: Artillery Red Hexagon Crossbow Badge (Pháo Binh)
export const TroopCrossbowIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" fill="#2b0e0e" stroke="#ef4444" strokeWidth="3" />
    <polygon points="32,8 54,20 54,44 32,56 10,44 10,20" fill="url(#artilleryGrad)" stroke="#b91c1c" strokeWidth="1.5" />
    <path d="M18 18L46 46M46 18L18 46" stroke="#f87171" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="32" cy="32" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
    <defs>
      <linearGradient id="artilleryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7f1d1d" />
        <stop offset="100%" stopColor="#180808" />
      </linearGradient>
    </defs>
  </svg>
);

// Troop Summary: Total Gold Knight Helmet Badge (Tổng số lượng quân lính)
export const TroopHelmetIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" fill="#3b270a" stroke="#ffd700" strokeWidth="3" />
    <polygon points="32,8 54,20 54,44 32,56 10,44 10,20" fill="url(#helmetGrad)" stroke="#ca8a04" strokeWidth="1.5" />
    <path d="M22 22C22 16 42 16 42 22V38C42 44 32 48 32 48C32 48 22 44 22 38V22Z" fill="#ffd700" stroke="#78350f" strokeWidth="2" />
    <rect x="26" y="28" width="12" height="4" rx="2" fill="#1c1308" />
    <path d="M32 12V20" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
    <defs>
      <linearGradient id="helmetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#854d0e" />
        <stop offset="100%" stopColor="#2e1b05" />
      </linearGradient>
    </defs>
  </svg>
);
