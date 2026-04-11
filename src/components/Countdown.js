import React, { useState, useEffect } from "react";
import "./Countdown.css";
import api from "../utils/api";

const Countdown = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [targetDate, setTargetDate] = useState(null);
  const [displayEvent, setDisplayEvent] = useState("");
  const [remainingDays, setRemainingDays] = useState(null);
  const [countdownId, setCountdownId] = useState(null);

  // Load countdown(s) from MySQL
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/countdowns");
        const rows = Array.isArray(res.data) ? res.data : [];
        if (!rows.length) return;

        const now = new Date();
        const upcoming = rows
          .map((r) => ({ ...r, _t: new Date(r.targetDate) }))
          .filter((r) => !Number.isNaN(r._t.getTime()))
          .sort((a, b) => a._t - b._t)
          .find((r) => r._t >= now) || rows[0];

        if (upcoming?.targetDate) {
          const dateMs = new Date(upcoming.targetDate).getTime();
          setTargetDate(dateMs);
          setSelectedDate(upcoming.targetDate);
        }
        if (upcoming?.title) {
          setEventName(upcoming.title);
          setDisplayEvent(upcoming.title);
        }
        setCountdownId(upcoming?.id || null);
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to load countdowns", err);
      }
    })();
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (!targetDate) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance <= 0) {
        setRemainingDays(0);
        clearInterval(interval);
      } else {
        const days = Math.ceil(distance / (1000 * 60 * 60 * 24));
        setRemainingDays(days);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  // Save countdown to MySQL (USER-SPECIFIC via JWT)
  const handleSave = () => {
    if (!selectedDate || !eventName.trim()) return;

    const date = new Date(selectedDate).getTime();
    setTargetDate(date);
    setDisplayEvent(eventName);

    (async () => {
      try {
        if (countdownId) {
          await api.put(`/api/countdowns/${countdownId}`, { title: eventName, targetDate: selectedDate });
        } else {
          const res = await api.post("/api/countdowns", { title: eventName, targetDate: selectedDate });
          setCountdownId(res.data?.id || null);
        }
        setShowPopup(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to save countdown", err);
      }
    })();
  };

  return (
    <div className="countdown-container">
      <div className="countdown-card" onClick={() => setShowPopup(true)}>
        <h3>Countdown</h3>
        <h1>{remainingDays !== null ? remainingDays : "--"}</h1>
        <p className="days-left-text">Days Left</p>
        {displayEvent && (
          <div className="event-name-display">{displayEvent}</div>
        )}
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h2>Set Countdown</h2>
            <input
              className="popup-input"
              type="text"
              placeholder="Event Name (e.g. Exams)"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
            <input
              className="popup-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <div className="popup-buttons">
              <button className="save-btn-countdown" onClick={handleSave}>
                Save
              </button>
              <button
                className="cancel-btn-countdown"
                onClick={() => setShowPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Countdown;
