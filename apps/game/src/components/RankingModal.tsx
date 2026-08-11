import { useEffect, useMemo, useState } from "react";
import { MedievalModal } from "./MedievalModal";
import { getMilitaryLeaderboard, type LeaderboardEntry } from "../game/api";

type Props = { token: string; onClose: () => void };

const FRAME_BY_RANK: Record<number, string> = {
  1: "/assets/leaderboard/leaderboard_frame_gold.png",
  2: "/assets/leaderboard/leaderboard_frame_silver.png",
  3: "/assets/leaderboard/leaderboard_frame_bronze.png",
};
const AVATARS = ["emperor", "warlord", "queen", "knight", "merchant", "scholar", "nomad", "alchemist"];

function avatarFor(playerId: string) {
  let value = 0;
  for (let i = 0; i < playerId.length; i += 1) value = (value * 31 + playerId.charCodeAt(i)) >>> 0;
  return `/assets/avatars/${AVATARS[value % AVATARS.length]}.png`;
}

function prestige(value: number) {
  return Math.max(0, value).toLocaleString("vi-VN");
}

function kingdomName(entry: LeaderboardEntry) {
  return entry.cityName?.trim() || entry.name;
}

function TopCommander({ entry }: { entry: LeaderboardEntry }) {
  const title = entry.rank === 1 ? "BÁ CHỦ ĐẠI LỤC" : entry.rank === 2 ? "ĐỆ NHỊ VƯƠNG" : "ĐỆ TAM VƯƠNG";
  return <article className={`kr-champion kr-rank-${entry.rank}${entry.isCurrentPlayer ? " is-player" : ""}`}>
    <header className="kr-champion-ribbon"><span>{title}</span><b>0{entry.rank}</b></header>
    <div className="kr-champion-crest" style={{ "--player-color": entry.flagColor } as React.CSSProperties}>
      <div className="kr-champion-avatar"><img src={avatarFor(entry.playerId)} alt="" /></div>
      <img className="kr-champion-frame" src={FRAME_BY_RANK[entry.rank]} alt="" />
    </div>
    <div className="kr-champion-copy">
      <strong>{kingdomName(entry)}</strong>
      <small>Lãnh chúa {entry.name}</small>
      <div><span>UY THẾ</span><b>{prestige(entry.prestige)}</b></div>
    </div>
    {entry.isCurrentPlayer && <span className="kr-you-badge">BẠN</span>}
  </article>;
}

export function RankingModal({ token, onClose }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMilitaryLeaderboard(token).then((res) => {
      if (!active) return;
      setLeaderboard(res.leaderboard);
      setCurrentPlayer(res.currentPlayer);
    }).catch(() => { if (active) setError("Không thể tải Bảng Uy Thế từ máy chủ"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const topThree = useMemo(() => leaderboard.filter((entry) => entry.rank <= 3), [leaderboard]);
  const remaining = useMemo(() => leaderboard.filter((entry) => entry.rank > 3), [leaderboard]);
  const visibleRanks = remaining;
  const nextPrestige = currentPlayer && currentPlayer.rank > 1
    ? leaderboard.find((entry) => entry.rank === currentPlayer.rank - 1)?.prestige
    : undefined;

  return <MedievalModal className="ranking-modal-royal kingdom-ranking-v4" title="BẢNG UY THẾ VƯƠNG QUỐC" subtitle="Vinh danh những đế chế hùng mạnh nhất lục địa" onClose={onClose} width="920px" maxWidth="96vw">
    <section className="kr-board">
      {loading ? <div className="kr-state">Đang mở Sổ Vàng Đế Quốc...</div> : error ? <div className="kr-state is-error">{error}</div> : leaderboard.length === 0 ? <div className="kr-state">Chưa có Vương quốc nào được ghi danh.</div> : <>
        <div className="kr-podium" aria-label="Ba Vương quốc dẫn đầu">
          {topThree.filter((entry) => entry.rank === 2).map((entry) => <TopCommander key={entry.playerId} entry={entry}/>)}
          {topThree.filter((entry) => entry.rank === 1).map((entry) => <TopCommander key={entry.playerId} entry={entry}/>)}
          {topThree.filter((entry) => entry.rank === 3).map((entry) => <TopCommander key={entry.playerId} entry={entry}/>)}
        </div>
        <div className="kr-list-title"><span>DANH SÁCH QUYỀN LỰC</span><small>{leaderboard.length} vương quốc được ghi danh</small></div>
        <div className="kr-list-head"><span>HẠNG</span><span>VƯƠNG QUỐC</span><span>THÀNH TRÌ</span><span>LÃNH ĐỊA</span><span>UY THẾ</span></div>
        <div className="kr-list">
          {visibleRanks.map((entry) => <div className={`kr-row${entry.isCurrentPlayer ? " is-player" : ""}`} key={entry.playerId}>
            <b className="kr-row-rank">{String(entry.rank).padStart(2, "0")}</b>
            <div className="kr-kingdom"><span style={{ "--player-color": entry.flagColor } as React.CSSProperties}><img src={avatarFor(entry.playerId)} alt=""/></span><div><strong>{kingdomName(entry)}</strong><small>Lãnh chúa {entry.name}</small></div></div>
            <span className="kr-level">Cấp {entry.capitalLevel}</span><span className="kr-lands">{entry.townCount}</span><strong className="kr-score">{prestige(entry.prestige)}</strong>
          </div>)}
        </div>
        {currentPlayer && <aside className="kr-self"><div className="kr-self-rank"><small>HẠNG CỦA BẠN</small><strong>#{currentPlayer.rank}</strong></div><div className="kr-self-name"><strong>{kingdomName(currentPlayer)}</strong><small>Lãnh chúa {currentPlayer.name}</small></div><div className="kr-self-score"><b>{prestige(currentPlayer.prestige)}</b><span>UY THẾ</span></div>{nextPrestige !== undefined && <p>Cần thêm <strong>{prestige(Math.max(0, nextPrestige - currentPlayer.prestige + 1))}</strong> để thăng hạng</p>}</aside>}
      </>}
      <footer className="kr-footer"><p>Uy Thế tổng hợp sức mạnh quân sự, lãnh thổ và thành trì.</p><button type="button" onClick={onClose}>ĐÓNG</button></footer>
    </section>
  </MedievalModal>;
}
