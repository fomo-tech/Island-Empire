import { useState, type ReactNode } from "react";
import { AssetIcon, type IconAssetId } from "./AssetIcon";
import { MedievalModal } from "./MedievalModal";

type ConfirmTone = "danger" | "warning" | "gold";

interface ConfirmModalProps {
  title: string;
  subtitle?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: IconAssetId | string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmModal({
  title,
  subtitle = "SẮC LỆNH HOÀNG GIA · CẦN XÁC NHẬN",
  message,
  confirmLabel = "XÁC NHẬN",
  cancelLabel = "HỦY",
  tone = "warning",
  icon = "settingsInfo",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <MedievalModal
      title={title}
      subtitle={subtitle}
      onClose={busy ? () => undefined : onClose}
      width="min(92vw, 480px)"
      maxWidth="92vw"
      className={`confirm-modal confirm-modal-${tone}`}
    >
      <div
        className="confirm-modal-shell"
        role="alertdialog"
        aria-live="assertive"
      >
        <div className="confirm-modal-sigil" aria-hidden="true">
          <span className="confirm-modal-sigil-ring" />
          <AssetIcon asset={icon} size={58} />
        </div>
        <div className="confirm-modal-copy">
          <strong className="confirm-modal-kicker">XÁC NHẬN MỆNH LỆNH</strong>
          <p className="confirm-modal-message">{message}</p>
        </div>
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-button confirm-modal-button-cancel"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-modal-button confirm-modal-button-confirm"
            onClick={handleConfirm}
            disabled={busy}
          >
            <AssetIcon asset={icon} size={18} />
            <span>{busy ? "ĐANG XỬ LÝ..." : confirmLabel}</span>
          </button>
        </div>
      </div>
    </MedievalModal>
  );
}
