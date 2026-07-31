import React from "react";

interface MedievalModalProps {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
  maxWidth?: string;
}

export const MedievalModal: React.FC<MedievalModalProps> = ({
  onClose,
  title,
  subtitle,
  children,
  width,
  maxWidth,
}) => {
  return (
    <div className="medieval-modal-overlay" onClick={onClose}>
      <div 
        className="medieval-modal-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ width, maxWidth }}
      >
        <button onClick={onClose} className="medieval-modal-close-btn" aria-label="Đóng">
          ×
        </button>
        <header className="medieval-modal-header">
          <h2 className="medieval-modal-title">{title}</h2>
          {subtitle && <p className="medieval-modal-subtitle">{subtitle}</p>}
        </header>
        <div className="medieval-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};
