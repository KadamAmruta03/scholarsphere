import React, { useEffect, useState } from "react";
import "./Remainder.css";
import api from "../utils/api";
import Toast from "./Toast";

function Remainder() {
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState("");
  const [currentWeek, setCurrentWeek] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });

  const showToast = (message, type = "info") => setToast({ open: true, message, type });

  const getWeekNumber = (date) => {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDays = Math.floor((date - firstDay) / 86400000);
    return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
  };

  useEffect(() => {
    const week = getWeekNumber(new Date());
    setCurrentWeek(week);

    (async () => {
      try {
        const res = await api.get("/api/reminders", { params: { week } });
        const list = Array.isArray(res.data?.reminders) ? res.data.reminders : [];
        setReminders(list);
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to load reminders", err);
        setReminders([]);
      }
    })();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const text = newReminder.trim();
    if (!text) return;

    (async () => {
      try {
        const res = await api.post("/api/reminders", {
          text,
          weekNumber: currentWeek || getWeekNumber(new Date()),
        });
        setReminders((prev) => [res.data, ...prev]);
        setNewReminder("");
        showToast("Reminder added", "success");
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to add reminder", err);
        showToast("Failed to add reminder", "error");
      }
    })();
  };

  const toggleReminder = (index) => {
    const rem = reminders[index];
    if (!rem?.id) return;

    const nextCompleted = !rem.completed;
    setReminders((prev) => prev.map((r, i) => (i === index ? { ...r, completed: nextCompleted } : r)));

    (async () => {
      try {
        await api.put(`/api/reminders/${rem.id}`, { completed: nextCompleted });
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to update reminder", err);
        setReminders((prev) => prev.map((r, i) => (i === index ? { ...r, completed: !nextCompleted } : r)));
        showToast("Failed to update reminder", "error");
      }
    })();
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="diary-container">
      <div className="diary-page">
        <div className="diary-header">
          <h2>Reminders!</h2>
          <p className="date">{formattedDate}</p>
        </div>

        <ul className="diary-lines">
          {reminders.map((rem, index) => (
            <li
              key={rem.id || index}
              onDoubleClick={() => toggleReminder(index)}
              className={`diary-entry ${rem.completed ? "completed" : ""}`}
            >
              {rem.text}
            </li>
          ))}
        </ul>

        <input
          className="diary-input"
          placeholder="Write your reminder and press Enter..."
          value={newReminder}
          onChange={(e) => setNewReminder(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}

export default Remainder;

