import { useEffect, useState } from "react";
import type { AllianceAid, AllianceInfo } from "@island/shared";
import { claimAllianceAid, createAlliance, getAllianceState, joinAlliance, leaveAlliance, sendAllianceAid } from "../game/api";

type AllyModalProps = {
  token: string | null;
  playerId: string | null;
  onClose: () => void;
  onNotify?: (message: string) => void;
};

export function AllyModal({ token, playerId, onClose, onNotify }: AllyModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alliance, setAlliance] = useState<AllianceInfo | null>(null);
  const [alliances, setAlliances] = useState<AllianceInfo[]>([]);
  const [aidInbox, setAidInbox] = useState<AllianceAid[]>([]);
  const [aidOutbox, setAidOutbox] = useState<AllianceAid[]>([]);
  const [allianceTroopReserve, setAllianceTroopReserve] = useState(0);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [emblem, setEmblem] = useState("shield");
  const [aidDraft, setAidDraft] = useState({
    toPlayerId: "",
    gold: 0,
    wood: 0,
    stone: 0,
    food: 0,
    iron: 0,
    troops: 0,
  });

  const applyAllianceState = (state: {
    alliance: AllianceInfo | null;
    alliances: AllianceInfo[];
    aidInbox: AllianceAid[];
    aidOutbox: AllianceAid[];
    allianceTroopReserve: number;
  }) => {
    setAlliance(state.alliance);
    setAlliances(state.alliances);
    setAidInbox(state.aidInbox);
    setAidOutbox(state.aidOutbox);
    setAllianceTroopReserve(state.allianceTroopReserve);
  };

  const load = async () => {
    if (!token) {
      setError("Bạn cần đăng nhập server để dùng liên minh");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const state = await getAllianceState(token);
      applyAllianceState(state);
    } catch (err: any) {
      setError(err.message || "Không tải được dữ liệu liên minh");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const runAction = async (action: () => Promise<{ alliance: AllianceInfo | null }>, success: string) => {
    if (!token) return;
    setError(null);
    try {
      const result = await action();
      setAlliance(result.alliance);
      onNotify?.(success);
      await load();
    } catch (err: any) {
      setError(err.message || "Lệnh liên minh thất bại");
    }
  };

  const runStateAction = async (action: () => Promise<{
    alliance: AllianceInfo | null;
    alliances: AllianceInfo[];
    aidInbox: AllianceAid[];
    aidOutbox: AllianceAid[];
    allianceTroopReserve: number;
  }>, success: string) => {
    if (!token) return;
    setError(null);
    try {
      const state = await action();
      applyAllianceState(state);
      onNotify?.(success);
    } catch (err: any) {
      setError(err.message || "Lệnh viện trợ thất bại");
    }
  };

  const resourceText = (resources: Record<string, number | undefined>) => {
    const labels: Record<string, string> = { gold: "Vàng", wood: "Gỗ", stone: "Đá", food: "Lúa", iron: "Sắt", coal: "Than", sulfur: "Lưu huỳnh", gems: "Đá quý" };
    const parts = Object.entries(resources)
      .filter(([, value]) => (value || 0) > 0)
      .map(([key, value]) => `${labels[key] ?? key} +${Math.floor(value || 0)}`);
    return parts.length > 0 ? parts.join(", ") : "Không có tài nguyên";
  };

  const emblemLabel = (value: string) => ({
    shield: "Khiên",
    star: "Sao",
    tower: "Tháp",
    anchor: "Mỏ neo",
    flame: "Lửa",
  }[value] ?? "Khiên");

  return (
    <div className="modal-overlay alliance-overlay">
      <div className="alliance-modal">
        <button type="button" className="alliance-close" onClick={onClose}>×</button>
        <div className="alliance-title">LIÊN MINH VƯƠNG QUỐC</div>
        <div className="alliance-subtitle">Tạo liên minh tốn 100 kim cương. Mỗi liên minh tối đa 20 thành viên, có thể viện trợ tài nguyên và quân dự bị.</div>

        {error && <div className="alliance-error">{error}</div>}
        {loading ? (
          <div className="alliance-empty">Đang tải dữ liệu liên minh...</div>
        ) : alliance ? (
          <div className="alliance-grid">
            <section className="alliance-panel alliance-main-panel">
              <div className="alliance-panel-title">LIÊN MINH CỦA BẠN</div>
              <div className="alliance-badge">
                <span>{alliance.tag}</span>
                <strong>{alliance.name}</strong>
                <small>{emblemLabel(alliance.emblem)}</small>
              </div>
              <div className="alliance-stats">
                <div><span>Thành viên</span><strong>{alliance.memberCount}/{alliance.maxMembers}</strong></div>
                <div><span>Vai trò</span><strong>{alliance.leaderId === playerId ? "Minh chủ" : "Thành viên"}</strong></div>
                <div><span>Viện trợ chờ nhận</span><strong>{aidInbox.length}</strong></div>
                <div><span>Quân dự bị LM</span><strong>{allianceTroopReserve}</strong></div>
              </div>
              <button
                type="button"
                className="alliance-danger-btn"
                onClick={() => token && runAction(() => leaveAlliance(token), "Đã rời liên minh")}
              >
                RỜI LIÊN MINH
              </button>
            </section>
            <section className="alliance-panel">
              <div className="alliance-panel-title">THÀNH VIÊN</div>
              <div className="alliance-member-list">
                {alliance.members.map((member) => (
                  <div key={member.playerId} className="alliance-member-row">
                    <span>{member.name}</span>
                    <strong>{member.role === "leader" ? "MINH CHỦ" : "THÀNH VIÊN"}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="alliance-panel">
              <div className="alliance-panel-title">GỬI VIỆN TRỢ</div>
              <select
                className="alliance-select"
                value={aidDraft.toPlayerId}
                onChange={(event) => setAidDraft((prev) => ({ ...prev, toPlayerId: event.target.value }))}
              >
                <option value="">Chọn thành viên</option>
                {alliance.members.filter((member) => member.playerId !== playerId).map((member) => (
                  <option key={member.playerId} value={member.playerId}>{member.name}</option>
                ))}
              </select>
              <div className="alliance-aid-grid">
                {(["gold", "wood", "stone", "food", "iron", "troops"] as const).map((key) => (
                  <label key={key}>
                    <span>{key === "gold" ? "Vàng" : key === "wood" ? "Gỗ" : key === "stone" ? "Đá" : key === "food" ? "Lúa" : key === "iron" ? "Sắt" : "Lính"}</span>
                    <input
                      type="number"
                      min={0}
                      max={key === "troops" ? 500 : 999999}
                      value={aidDraft[key]}
                      onChange={(event) => setAidDraft((prev) => ({ ...prev, [key]: Math.max(0, Number(event.target.value) || 0) }))}
                    />
                  </label>
                ))}
              </div>
              <div className="alliance-note">Gửi lính tốn thêm 1 vàng + 2 lúa mỗi lính, tối đa 500 lính/lần.</div>
              <button
                type="button"
                className="alliance-primary-btn"
                onClick={() => runStateAction(
                  () => sendAllianceAid(token!, {
                    toPlayerId: aidDraft.toPlayerId,
                    resources: {
                      gold: aidDraft.gold,
                      wood: aidDraft.wood,
                      stone: aidDraft.stone,
                      food: aidDraft.food,
                      iron: aidDraft.iron,
                    },
                    troops: aidDraft.troops,
                  }),
                  "Đã gửi viện trợ liên minh",
                )}
              >
                GỬI VIỆN TRỢ
              </button>
            </section>
            <section className="alliance-panel">
              <div className="alliance-panel-title">VIỆN TRỢ CHỜ NHẬN</div>
              <div className="alliance-list">
                {aidInbox.length > 0 ? aidInbox.map((aid) => (
                  <div key={aid.id} className="alliance-list-row alliance-aid-row">
                    <div>
                      <strong>{aid.fromName}</strong>
                      <span>{resourceText(aid.resources)}{aid.troops > 0 ? ` · Lính +${aid.troops}` : ""}</span>
                    </div>
                    <button type="button" onClick={() => runStateAction(() => claimAllianceAid(token!, aid.id), "Đã nhận viện trợ liên minh")}>
                      NHẬN
                    </button>
                  </div>
                )) : (
                  <div className="alliance-empty">Chưa có viện trợ chờ nhận.</div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="alliance-grid">
            <section className="alliance-panel">
              <div className="alliance-panel-title">TẠO LIÊN MINH</div>
              <div className="alliance-cost">Chi phí lập liên minh: 100 kim cương</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên liên minh" maxLength={32} />
              <input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} placeholder="TAG 2-6 ký tự" maxLength={6} />
              <div className="alliance-emblem-picker">
                {(["shield", "star", "tower", "anchor", "flame"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={emblem === item ? "active" : ""}
                    onClick={() => setEmblem(item)}
                  >
                    <span className={`alliance-emblem-mark ${item}`} />
                    {emblemLabel(item)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="alliance-primary-btn"
                onClick={() => runAction(() => createAlliance(token!, name, tag, emblem), "Đã tạo liên minh")}
              >
                LẬP LIÊN MINH
              </button>
            </section>
            <section className="alliance-panel">
              <div className="alliance-panel-title">DANH SÁCH LIÊN MINH</div>
              <div className="alliance-list">
                {alliances.length > 0 ? alliances.map((item) => (
                  <div key={item.id} className="alliance-list-row">
                    <div>
                      <strong>[{item.tag}] {item.name}</strong>
                      <span>{emblemLabel(item.emblem)} · {item.memberCount}/{item.maxMembers} thành viên</span>
                    </div>
                    <button type="button" onClick={() => runAction(() => joinAlliance(token!, item.id), `Đã gia nhập ${item.name}`)}>
                      GIA NHẬP
                    </button>
                  </div>
                )) : (
                  <div className="alliance-empty">Chưa có liên minh nào. Hãy lập liên minh đầu tiên.</div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
