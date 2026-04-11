import React, { useEffect } from "react";
import "./Toast.css";

export default function Toast({ open, message, type = "info", duration = 2200, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open || !message) return null;

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      <div className="toast-message">{message}</div>
      <button type="button" className="toast-close" onClick={() => onClose?.()} aria-label="Close">
        ×
      </button>
    </div>
  );
}

