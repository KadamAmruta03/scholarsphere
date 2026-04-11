import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FaSave } from "react-icons/fa";
import "./Journal.css";
import api from "../utils/api";
import Toast from "./Toast";

const Journal = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [text, setText] = useState("");
  const [saveActive, setSaveActive] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });

  const showToast = (message, type = "info") => setToast({ open: true, message, type });

  useEffect(() => {
    const formattedDate = selectedDate.toDateString();
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/api/journal", { params: { date: formattedDate } });
        if (cancelled) return;
        setText(res.data?.entry_text || "");
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to load journal entry", err);
        if (!cancelled) setText("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const saveEntry = async () => {
    const formattedDate = selectedDate.toDateString();

    try {
      await api.post("/api/journal", { entryDate: formattedDate, entryText: text });
      setSaveActive(true);
      setTimeout(() => setSaveActive(false), 700);
      showToast("Journal saved", "success");
    } catch (err) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === "development") console.error("Failed to save journal entry", err);
      showToast("Failed to save journal", "error");
    }
  };

  return (
    <div className="journal-container">
      <div className="journal-foreground">
        <div className="journal-calendar">
          <Calendar onChange={setSelectedDate} value={selectedDate} className="custom-calendar" />
        </div>

        <div className="journal-editor">
          <div className="journal-topbar">
            <FaSave
              className={`action-icon ${saveActive ? "active-icon" : ""}`}
              title="Save Entry"
              onClick={saveEntry}
            />
            <h2 className="journal-heading">Journal — {selectedDate.toDateString()}</h2>
          </div>

          <div className="journal-entry">
            <textarea
              className="journal-textarea"
              placeholder="Write about your day..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
};

export default Journal;

