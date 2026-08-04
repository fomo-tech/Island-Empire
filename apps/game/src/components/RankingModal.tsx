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
const PAGE_SIZE = 7;

function avatarFor(playerId: string) {
  let value = 0;
  for (let i = 0; i < playerId.length; i += 1) value = (value * 31 + playerId.charCodeAt(i)) >>> 0;
  return `/assets/avatars/${AVATARS[value % AVATARS.length]}.png`;
}

function prestige(value: number) {
  return Math.max(0, value).toLocaleString("vi-VN");
}

function TopCommander({ entry }: { entry: LeaderboardEntry }) {
  return <article className={`prestige-champion rank-${entry.rank}${entry.isCurrentPlayer ? " is-player" : ""}`}>
    <div className="prestige-frame-wrap">
      <div className="prestige-avatar" style={{ "--player-color": entry.flagColor } as React.CSSProperties}>
        <img src={avatarFor(entry.playerId)} alt="" />
      </div>
      <img className="prestige-rank-frame" src={FRAME_BY_RANK[entry.rank]} alt={`Khung hạng ${entry.rank}`} />
    </div>
    <div className="prestige-champion-copy">
      <span>{entry.rank === 1 ? "BÁ CHỦ UY THẾ" : entry.rank === 2 ? "ĐỆ NHỊ VƯƠNG" : "ĐỆ TAM VƯƠNG"}</span>
      <strong>{entry.name}</strong>
      <small>{entry.cityName} · Thành cấp {entry.capitalLevel}</small>
      <b>{prestige(entry.prestige)} <i>UY THẾ</i></b>
    </div>
  </article>;
}

export function RankingModal({ token, onClose }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

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
  const pageCount = Math.max(1, Math.ceil(remaining.length / PAGE_SIZE));
  const visibleRanks = useMemo(() => remaining.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [remaining, page]);
  const nextPrestige = currentPlayer && currentPlayer.rank > 1
    ? leaderboard.find((entry) => entry.rank === currentPlayer.rank - 1)?.prestige
    : undefined;

  return <MedievalModal title="BẢNG UY THẾ VƯƠNG QUỐC" subtitle="Vinh danh những đế chế hùng mạnh nhất lục địa" onClose={onClose} width="1040px" maxWidth="96vw">
    <section className="prestige-board">
      {loading ? <div className="prestige-state">Đang mở Sổ Vàng Đế Quốc...</div> : error ? <div className="prestige-state error">{error}</div> : leaderboard.length === 0 ? <div className="prestige-state">Chưa có Vương quốc nào được ghi danh.</div> : <>
        <div className="prestige-podium" aria-label="Ba Vương quốc dẫn đầu">
          {topThree.filter((entry) => entry.rank === 2).map((entry) => <TopCommander key={entry.playerId} entry={entry}/>)}
          {topThree.filter((entry) => entry.rank === 1).map((entry) => <TopCommander key={entry.playerId} entry={entry}/>)}
          {topThree.filter((entry) => entry.rank === 3).map((entry) => <TopCommander key={entry.playerId} entry={entry}/>)}
        </div>
        <div className="prestige-list-head"><span>HẠNG</span><span>VƯƠNG QUỐC</span><span>THÀNH TRÌ</span><span>LÃNH ĐỊA</span><span>UY THẾ</span></div>
        <div className="prestige-list">
          {visibleRanks.map((entry) => <div className={`prestige-row${entry.isCurrentPlayer ? " is-player" : ""}`} key={entry.playerId}>
            <b className="prestige-rank">{String(entry.rank).padStart(2, "0")}</b>
            <div className="prestige-player"><span style={{ "--player-color": entry.flagColor } as React.CSSProperties}><img src={avatarFor(entry.playerId)} alt=""/></span><div><strong>{entry.name}</strong><small>{entry.cityName}</small></div></div>
            <span>Cấp {entry.capitalLevel}</span><span>{entry.townCount}</span><strong>{prestige(entry.prestige)}</strong>
          </div>)}
        </div>
        {currentPlayer && <aside className="prestige-self"><div><small>HẠNG CỦA BẠN</small><strong>#{currentPlayer.rank} · {currentPlayer.name}</strong></div><b>{prestige(currentPlayer.prestige)} <span>UY THẾ</span></b>{nextPrestige !== undefined && <p>Cần thêm <strong>{prestige(Math.max(0, nextPrestige - currentPlayer.prestige + 1))}</strong> để vượt hạng trên</p>}</aside>}
      </>}
      <footer className="prestige-footer"><p>Uy Thế gồm quân sự, lãnh thổ, thành trì và công trình.</p>{!loading && !error && remaining.length > PAGE_SIZE && <nav className="prestige-pages" aria-label="Trang bảng xếp hạng"><button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label="Trang trước">‹</button><span>{page + 1} / {pageCount}</span><button type="button" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={page >= pageCount - 1} aria-label="Trang sau">›</button></nav>}<button type="button" onClick={onClose}>ĐÓNG BẢNG XẾP HẠNG</button></footer>
    </section>
  </MedievalModal>;
}
