function darken(hex = "#2563eb", amount = 0.48) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return "#10295c";
  const rgb = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * amount));
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function ArtFrame({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#536b78" />
          <stop offset="48%" stopColor="#213440" />
          <stop offset="100%" stopColor="#070c10" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff0a3" />
          <stop offset="35%" stopColor="#d9a943" />
          <stop offset="100%" stopColor="#60400f" />
        </linearGradient>
        <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2=".75">
          <stop offset="0%" stopColor="#fff8df" />
          <stop offset="17%" stopColor="#dbe0df" />
          <stop offset="43%" stopColor="#7b8c96" />
          <stop offset="71%" stopColor="#30414d" />
          <stop offset="100%" stopColor="#0c151c" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="170%" height="190%">
          <feDropShadow dx="0" dy="4" stdDeviation="2.6" floodColor="#000" floodOpacity=".88" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <rect x="1" y="1" width="158" height="94" rx="5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="160" height="96" fill={`url(#${id}-sky)`} />
        <circle cx="126" cy="18" r="31" fill="#ffd77d" opacity=".08" />
        <path d="M0 63 Q28 50 51 61 T94 58 T160 50 V96 H0Z" fill="#101a1d" />
        <path d="M0 62 L22 46 L38 60 L57 38 L78 63Z" fill="#293c43" opacity=".78" />
        {children}
        <path d="M0 84 Q30 77 62 84 T160 79 V96 H0Z" fill="#020507" opacity=".72" />
      </g>
      <rect x="1" y="1" width="158" height="94" rx="5" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="1.5" />
      <path d="M7 14 V7 H20 M140 7 H153 V14 M7 82 V89 H20 M140 89 H153 V82" fill="none" stroke="#f2cc6c" strokeWidth="1.2" opacity=".7" />
    </>
  );
}

export function EuropeanInfantryArt({ color = "#2563eb" }: { color?: string }) {
  const dark = darken(color);
  return (
    <svg viewBox="0 0 160 96" className="unit-art-svg premium-unit-art" aria-label="Bộ binh thiết giáp châu Âu">
      <ArtFrame id="eu-inf">
        <defs>
          <linearGradient id="eu-inf-cloth" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="55%" stopColor={dark} />
            <stop offset="100%" stopColor="#080d12" />
          </linearGradient>
        </defs>
        <g opacity=".8">
          <path d="M13 65 L16 10" stroke="#65401e" strokeWidth="4" />
          <path d="M18 11 Q42 4 61 14 L55 38 Q36 29 18 36Z" fill="url(#eu-inf-cloth)" stroke="#e2b34d" strokeWidth="1.2" />
          <path d="M28 13 L35 21 L27 29 M45 10 L52 19 L44 27" fill="none" stroke="#f2d279" strokeWidth="2" />
        </g>
        <g filter="url(#eu-inf-shadow)">
          <path d="M53 93 Q51 65 66 50 Q83 40 104 51 Q117 65 119 93Z" fill="url(#eu-inf-steel)" stroke="#d8d9c9" strokeWidth="1.2" />
          <path d="M67 56 Q48 51 39 69 L54 80 L74 58Z" fill="url(#eu-inf-steel)" stroke="#e3dec6" strokeWidth="1.1" />
          <path d="M101 54 Q119 49 130 66 L117 78 L94 59Z" fill="url(#eu-inf-steel)" stroke="#e3dec6" strokeWidth="1.1" />
          <path d="M63 59 Q85 50 107 59 L112 94 H57Z" fill="url(#eu-inf-cloth)" stroke="#d8a942" strokeWidth="1.1" />
          <path d="M84 55 V94 M61 71 H110" stroke="#f0c860" strokeWidth="3" opacity=".92" />
          <path d="M73 60 Q85 67 98 59 L96 79 Q85 86 74 79Z" fill="#0c1318" opacity=".42" />
          <path d="M58 58 Q67 47 76 48 L72 63Z M102 53 Q116 54 122 65 L107 66Z" fill="#eef0df" opacity=".5" />

          <path d="M65 25 Q80 11 99 21 Q108 31 101 49 Q88 58 73 50 Q62 41 65 25Z" fill="url(#eu-inf-steel)" stroke="#ead9a0" strokeWidth="1.4" />
          <path d="M64 31 Q83 21 104 30 L101 38 L67 39Z" fill="#cbd3d2" />
          <path d="M69 38 H100 L96 47 H74Z" fill="#05090c" />
          <path d="M76 38 V47 M84 37 V48 M92 37 V47" stroke="#718590" strokeWidth="1.1" />
          <path d="M68 28 Q72 13 85 9 Q99 12 104 29 Q87 20 68 28Z" fill="#52646e" stroke="#d9c58b" strokeWidth="1" />
          <path d="M83 11 Q85 1 94 -1 Q103 3 99 11 Q90 7 83 11Z" fill="url(#eu-inf-cloth)" />
          <path d="M90 7 Q102 -3 116 2 Q103 7 97 17Z" fill={color} stroke="#dfb24b" strokeWidth=".8" />

          <path d="M111 61 L145 53 L154 77 Q142 94 121 92 L106 75Z" fill="url(#eu-inf-cloth)" stroke="url(#eu-inf-gold)" strokeWidth="2" />
          <path d="M132 58 V87 M116 70 H149" stroke="#f6d276" strokeWidth="3" />
          <path d="M132 63 L139 71 L132 81 L125 71Z" fill="#fff0aa" opacity=".88" />

          <path d="M40 82 L145 5" stroke="#eef1ec" strokeWidth="3" />
          <path d="M141 8 L158 -2 L151 15Z" fill="url(#eu-inf-steel)" stroke="#fff1ba" strokeWidth="1" />
          <path d="M40 82 L31 94" stroke="#72471f" strokeWidth="5" />
          <path d="M29 89 L43 96 M25 94 L36 99" stroke="#d9a943" strokeWidth="2" />
        </g>
        <path d="M17 88 H143" stroke="#d8a63e" strokeWidth=".8" opacity=".5" />
      </ArtFrame>
    </svg>
  );
}

export function EuropeanCavalryArt({ color = "#2563eb" }: { color?: string }) {
  const dark = darken(color);
  return (
    <svg viewBox="0 0 160 96" className="unit-art-svg premium-unit-art" aria-label="Kị sĩ thiết giáp châu Âu">
      <ArtFrame id="eu-cav">
        <defs>
          <linearGradient id="eu-cav-cloth" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="58%" stopColor={dark} />
            <stop offset="100%" stopColor="#080d12" />
          </linearGradient>
          <linearGradient id="eu-cav-horse" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bd8050" />
            <stop offset="42%" stopColor="#704429" />
            <stop offset="100%" stopColor="#21130c" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="20" r="17" fill="#efb25e" opacity=".14" />
        <g filter="url(#eu-cav-shadow)">
          <path d="M13 88 Q17 61 48 49 Q85 39 129 62 L151 91 L145 98 H22Z" fill="url(#eu-cav-horse)" stroke="#cb8e5a" strokeWidth="1.4" />
          <path d="M51 58 Q35 27 15 24 L2 35 L7 58 L33 69Z" fill="url(#eu-cav-horse)" stroke="#cc8e5a" strokeWidth="1.2" />
          <path d="M16 26 L5 13 L26 21 M31 31 L39 19 L38 39" fill="#4b2b19" stroke="#bd7949" strokeWidth="1" />
          <path d="M5 42 Q22 31 40 44 L35 55 Q20 48 7 56Z" fill="url(#eu-cav-steel)" stroke="#ddca91" strokeWidth="1" />
          <circle cx="17" cy="34" r="2.6" fill="#06090b" stroke="#e8bb54" strokeWidth="1" />
          <path d="M9 55 Q18 64 31 57" fill="none" stroke="#e0ae69" strokeWidth="1.2" />
          <path d="M29 67 Q15 72 13 85" fill="none" stroke="#ddbc75" strokeWidth="2.5" />

          <path d="M43 55 Q78 40 121 61 L137 89 Q94 99 39 86Z" fill="url(#eu-cav-cloth)" stroke="url(#eu-cav-gold)" strokeWidth="1.5" />
          <path d="M78 48 V93 M45 69 H132" stroke="#eac25f" strokeWidth="2.5" />
          <path d="M83 59 L94 69 L83 81 L72 69Z" fill="#f5d475" />
          <path d="M82 61 V78 M76 67 H90" stroke="#55350d" strokeWidth="1.7" />

          <path d="M63 43 Q76 32 93 38 L108 68 L70 69 L56 55Z" fill="url(#eu-cav-steel)" stroke="#e5d9b1" strokeWidth="1.2" />
          <path d="M80 20 Q91 9 104 18 Q114 29 106 46 Q94 55 82 47 Q76 34 80 20Z" fill="url(#eu-cav-steel)" stroke="#ead59a" strokeWidth="1.3" />
          <path d="M80 27 Q97 18 110 27 L108 34 L82 36Z" fill="#ccd4d3" />
          <path d="M84 35 H107 L102 44 H87Z" fill="#05090c" />
          <path d="M90 35 V44 M97 34 V45" stroke="#748893" strokeWidth="1" />
          <path d="M86 19 Q91 5 101 10 L108 21Z" fill="#536570" stroke="#d1b66e" />
          <path d="M94 12 Q104 0 121 5 Q107 11 104 25Z" fill={color} stroke="#d9aa42" strokeWidth="1" />
          <path d="M56 54 Q39 55 31 67 L47 75 L70 61Z" fill="url(#eu-cav-steel)" stroke="#e2d6ae" />

          <path d="M17 85 L148 6" stroke="#e3b75b" strokeWidth="4" strokeLinecap="round" />
          <path d="M144 8 L160 -2 L154 15Z" fill="url(#eu-cav-steel)" stroke="#fff1ba" strokeWidth="1" />
          <path d="M105 29 L137 21 L139 39 Q123 33 109 43Z" fill="url(#eu-cav-cloth)" stroke="#e5b650" strokeWidth="1.1" />
          <path d="M116 28 L126 34 L118 39" fill="none" stroke="#f3d170" strokeWidth="1.8" />
        </g>
      </ArtFrame>
    </svg>
  );
}

export function EuropeanArtilleryArt({ color = "#2563eb" }: { color?: string }) {
  const dark = darken(color);
  return (
    <svg viewBox="0 0 160 96" className="unit-art-svg premium-unit-art" aria-label="Pháo binh dã chiến châu Âu">
      <ArtFrame id="eu-art">
        <defs>
          <linearGradient id="eu-art-cloth" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="60%" stopColor={dark} />
            <stop offset="100%" stopColor="#090d11" />
          </linearGradient>
          <linearGradient id="eu-art-bronze" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff0af" />
            <stop offset="18%" stopColor="#e1ad55" />
            <stop offset="52%" stopColor="#916026" />
            <stop offset="82%" stopColor="#482b10" />
            <stop offset="100%" stopColor="#1c1006" />
          </linearGradient>
          <linearGradient id="eu-art-wood" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ae7238" />
            <stop offset="55%" stopColor="#60371a" />
            <stop offset="100%" stopColor="#231208" />
          </linearGradient>
          <radialGradient id="eu-art-flash">
            <stop offset="0%" stopColor="#fffbd1" />
            <stop offset="25%" stopColor="#ffd15e" />
            <stop offset="68%" stopColor="#ff792e" stopOpacity=".7" />
            <stop offset="100%" stopColor="#ff5b22" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M0 55 Q12 40 25 48 Q34 35 49 47 Q60 39 72 53" fill="#d4c9ad" opacity=".13" />
        <circle cx="150" cy="31" r="26" fill="url(#eu-art-flash)" opacity=".82" />
        <path d="M142 30 L160 18 M147 36 L163 41 M137 25 L140 8" stroke="#ffd36b" strokeWidth="1.5" opacity=".85" />
        <g filter="url(#eu-art-shadow)">
          <path d="M42 62 L116 42 L137 56 L58 75Z" fill="url(#eu-art-bronze)" stroke="#ffe09a" strokeWidth="1.4" />
          <path d="M103 45 L143 28 L159 39 L124 58Z" fill="url(#eu-art-bronze)" stroke="#ffe6a8" strokeWidth="1.7" />
          <ellipse cx="154" cy="34" rx="8.5" ry="6.5" transform="rotate(19 154 34)" fill="#1b1108" stroke="#dca54b" strokeWidth="2.4" />
          <path d="M51 69 L120 55 L129 67 L57 82Z" fill="url(#eu-art-wood)" stroke="#bd7d3d" strokeWidth="1.2" />
          <path d="M68 64 L59 91 M111 56 L121 85" stroke="#b17c3d" strokeWidth="5" />

          <g fill="#12171a" stroke="#cc9849" strokeWidth="3">
            <circle cx="55" cy="82" r="18" />
            <circle cx="116" cy="77" r="16" />
          </g>
          <g stroke="#99a5aa" strokeWidth="1.4">
            <path d="M55 64 V100 M37 82 H73 M42 69 L68 95 M42 95 L68 69" />
            <path d="M116 61 V93 M100 77 H132 M105 66 L127 88 M105 88 L127 66" />
          </g>
          <circle cx="55" cy="82" r="5.2" fill="url(#eu-art-bronze)" />
          <circle cx="116" cy="77" r="4.8" fill="url(#eu-art-bronze)" />

          <path d="M10 53 Q24 43 38 54 L42 88 H9Z" fill="url(#eu-art-cloth)" stroke="#dcaa45" strokeWidth="1.2" />
          <path d="M12 57 L33 54 L37 62 L13 67Z" fill="#172228" opacity=".75" />
          <circle cx="23" cy="38" r="11" fill="#a87955" stroke="#3b2517" />
          <path d="M11 38 Q22 23 37 35 L36 43 L11 44Z" fill="#52636b" stroke="#deca86" strokeWidth="1.1" />
          <path d="M15 33 L30 30 L37 36 L12 40Z" fill="#7b8c94" />
          <path d="M35 59 L54 67" stroke="#c38a57" strokeWidth="5" />
          <path d="M10 87 L5 99 M38 87 L44 99" stroke="#342116" strokeWidth="5" />

          <path d="M93 19 L96 67" stroke="#654018" strokeWidth="3" />
          <path d="M97 20 Q121 10 143 21 L136 43 Q119 32 97 42Z" fill="url(#eu-art-cloth)" stroke="#e4b64f" strokeWidth="1.3" />
          <path d="M109 21 L121 29 L111 38 M128 18 L137 27 L128 35" fill="none" stroke="#f4d57b" strokeWidth="1.8" />
        </g>
        <circle cx="138" cy="15" r="1.4" fill="#ffd36b" />
        <circle cx="151" cy="10" r="1.1" fill="#ff8d35" />
        <circle cx="131" cy="31" r="1" fill="#fff0a0" />
      </ArtFrame>
    </svg>
  );
}
