import React, { useState } from "react";
import { MedievalModal } from "./MedievalModal";

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
    <MedievalModal title="💬 TRÒ CHUYỆN VƯƠNG QUỐC" onClose={onClose} maxWidth="500px">
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Gõ tin nhắn gửi đến các thế lực..."
          autoFocus
          maxLength={100}
          className="kc-input"
          style={{ flex: 1, padding: "10px 14px", fontSize: 14 }}
        />
        <button 
          type="submit" 
          disabled={!text.trim()} 
          className="kc-btn-primary"
          style={{ padding: "10px 20px", fontSize: 14, cursor: text.trim() ? "pointer" : "default" }}
        >
          GỬI
        </button>
      </form>
      
      <div className="parchment-card" style={{ fontSize: 12, marginTop: 16, padding: "10px 14px", lineHeight: 1.5 }}>
        <strong>Bản Thư Tịch Hướng Dẫn:</strong>
        <p style={{ margin: "4px 0 0 0", color: "rgba(0,0,0,0.65)" }}>
          Nhắn các từ khóa như <span style={{ color: "#7f1d1d", fontWeight: "bold" }}>chào</span>, <span style={{ color: "#7f1d1d", fontWeight: "bold" }}>tấn công</span>, hoặc <span style={{ color: "#7f1d1d", fontWeight: "bold" }}>giao thương</span> để nhận mật báo phản hồi từ các thế lực trí tuệ nhân tạo (AI) lân cận.
        </p>
      </div>
    </MedievalModal>
  );
};
