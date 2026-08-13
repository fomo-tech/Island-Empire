import React from "react";
import { MedievalModal } from "./MedievalModal";

interface Town {
  id: number;
  x: number;
  y: number;
  lvl: number;
  owner: number;
  troops: number;
}

interface TreasureModalProps {
  towns: Town[];
  regionOwnership: number[];
  onClose: () => void;
}

export const TreasureModal: React.FC<TreasureModalProps> = ({
  towns: _towns,
  regionOwnership: _regionOwnership,
  onClose,
}) => {
  return (
    <MedievalModal
      title="👑 SỰ KIỆN HOÀNG GIA"
      subtitle="TRUNG TÂM SỰ KIỆN"
      onClose={onClose}
      maxWidth="520px"
      className="royal-events-modal"
    >
      <div className="royal-events-menu" role="status" aria-live="polite">
        <div className="royal-events-menu-grid">
          <button type="button" className="royal-event-menu-tile" disabled>
            <span className="royal-event-icon-frame">
              <img src="/assets/icons/icon_event.png" alt="" />
            </span>
            <strong>SỰ KIỆN</strong>
            <small>Chưa có sự kiện</small>
            <em>ĐANG CHỜ</em>
          </button>
          <button type="button" className="royal-event-menu-tile" disabled>
            <span className="royal-event-icon-frame royal-event-crown">
              <img src="/assets/icons/icon_gold_crown.png" alt="" />
            </span>
            <strong>KHO BÁU</strong>
            <small>Chưa mở khóa</small>
            <em>ĐANG CHỜ</em>
          </button>
        </div>
        <p className="royal-events-menu-note">
          Triều đình sẽ cập nhật thử thách và phần thưởng mới tại đây.
        </p>
      </div>
    </MedievalModal>
  );
};
