import React, { useState } from "react";

interface ChatInputModalProps {
  onSend: (msg: string) => void;
  onClose: () => void;
}

export const ChatInputModal: React.FC<ChatInputModalProps> = ({ onSend, onClose }) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    onClose();
  };

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={onClose}>
      <div className="modal-container" style={styles.container} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
        <h2 style={styles.title}>💬 TRÒ CHUYỆN VƯƠNG QUỐC</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Gõ tin nhắn gửi đến các thế lực..."
            autoFocus
            maxLength={100}
            style={styles.input}
          />
          <button type="submit" disabled={!text.trim()} style={styles.sendBtn}>
            GỬI
          </button>
        </form>
        <div style={styles.hint}>
          Gợi ý: Nhắn <span style={styles.code}>chào</span>, <span style={styles.code}>tấn công</span>, hoặc <span style={styles.code}>giao thương</span> để nhận phản hồi từ AI thế lực.
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.72)",
    display: "grid",
    placeItems: "center",
    zIndex: 1000,
    fontFamily: "Courier New, monospace",
  },
  container: {
    background: "rgba(11, 22, 33, 0.96)",
    backdropFilter: "blur(12px)",
    border: "2px solid #b38f4f",
    borderRadius: "8px",
    padding: "24px",
    width: "90%",
    maxWidth: "500px",
    color: "#f6e7bd",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.9), inset 0 0 15px rgba(179, 143, 79, 0.2)",
    position: "relative" as const,
  },
  closeBtn: {
    position: "absolute" as const,
    right: "16px",
    top: "16px",
    background: "transparent",
    border: "none",
    color: "#8196a3",
    fontSize: "24px",
    cursor: "pointer",
    lineHeight: "1",
  },
  title: {
    color: "#ffd34d",
    marginTop: 0,
    borderBottom: "2px solid #513922",
    paddingBottom: "12px",
    fontSize: "18px",
    textShadow: "2px 2px 0 #000",
  },
  form: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
  },
  input: {
    flex: 1,
    background: "#071018",
    border: "2px solid #2b3b45",
    color: "#fff3d2",
    borderRadius: "4px",
    padding: "10px 14px",
    fontSize: "14px",
    fontFamily: "Courier New, monospace",
    outline: "none",
  },
  sendBtn: {
    background: "#2b3b45",
    color: "#ffd34d",
    border: "2px solid #513922",
    padding: "10px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold" as const,
    fontFamily: "Courier New, monospace",
  },
  hint: {
    fontSize: "12px",
    color: "#8196a3",
    marginTop: "12px",
    lineHeight: "1.4",
  },
  code: {
    color: "#ffd34d",
    background: "#071018",
    padding: "2px 4px",
    borderRadius: "3px",
  },
};
