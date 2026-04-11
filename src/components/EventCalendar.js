import React, { useState, useEffect } from "react";
import "./EventCalendar.css";
import api from "../utils/api";

function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const eventColors = [
    "#0B3D91", "#1A1A40", "#4B1D3F", "#3A0CA3", "#5A1E76", "#5C2E58",
    "#8B0000", "#6A040F", "#7F2B1D", "#8B4513", "#654321",
    "#0F5132", "#1F4529", "#00332A", "#003F5C",
    "#2C3E50", "#4A4A4A"
  ];

  const [events, setEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupEventInput, setPopupEventInput] = useState("");
  const [popupTempEvents, setPopupTempEvents] = useState([]);

  const monthNames = [
    "January","February","March","April",
    "May","June","July","August",
    "September","October","November","December"
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Load events from MySQL for this user (JWT-based)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/calendar");
        const rows = Array.isArray(res.data) ? res.data : [];
        const grouped = {};

        rows.forEach((r) => {
          const key = String(r.event_date || "").trim();
          if (!key) return;
          grouped[key] = grouped[key] || [];
          grouped[key].push({ id: r.id, text: r.event_text, color: r.event_color });
        });

        setEvents(grouped);
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("Failed to load calendar events", err);
        setEvents({});
      }
    })();
  }, []);

  const formatDateKey = (y, m0, d) => {
    const mm = String(m0 + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  const openPopup = (dateKey) => {
    setSelectedDate(dateKey);
    const existing = events[dateKey] || [];
    setPopupTempEvents([...existing]);
    setPopupEventInput("");
    setPopupOpen(true);
  };

  const handlePopupAddOne = async () => {
    const text = popupEventInput.trim();
    if (!text) return;

    const color = eventColors[Math.floor(Math.random() * eventColors.length)];
    try {
      const res = await api.post("/api/calendar", {
        eventDate: selectedDate,
        eventText: text,
        eventColor: color,
      });

      const saved = { id: res.data?.id, text, color };

      setEvents((prev) => {
        const next = { ...prev };
        next[selectedDate] = [...(next[selectedDate] || []), saved];
        return next;
      });

      setPopupTempEvents((prev) => [...prev, saved]);
      setPopupEventInput("");
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Failed to add calendar event", err);
    }
  };

  const handlePopupRemoveOne = (idx) => {
    const ev = popupTempEvents[idx];
    if (!ev?.id) return;

    const previousTempEvents = popupTempEvents;
    const previousEvents = events;

    setPopupTempEvents((prev) => prev.filter((_, i) => i !== idx));
    setEvents((prev) => {
      const next = { ...prev };
      next[selectedDate] = (next[selectedDate] || []).filter((e) => e.id !== ev.id);
      return next;
    });

    api.delete(`/api/calendar/${ev.id}`).catch((err) => {
      if (process.env.NODE_ENV === "development") console.error("Failed to delete calendar event", err);
      setPopupTempEvents(previousTempEvents);
      setEvents(previousEvents);
    });
  };

  const handlePopupSaveAll = () => {
    setPopupOpen(false);
  };

  const handleDeleteAllForDate = () => {
    (async () => {
      const list = popupTempEvents.slice();
      await Promise.all(
        list.filter((e) => e?.id).map((e) => api.delete(`/api/calendar/${e.id}`).catch(() => {}))
      );

      setEvents((prev) => {
        const next = { ...prev };
        delete next[selectedDate];
        return next;
      });
      setPopupTempEvents([]);
      setPopupOpen(false);
    })();
  };

  // Calendar grid
  let calendarGrid = [];
  for (let i = 0; i < firstDay; i++) {
    calendarGrid.push(<div key={`empty-${i}`} className="day empty"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const fullDate = formatDateKey(year, month, d);
    const eventList = events[fullDate] || [];
    const isToday =
      d === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    calendarGrid.push(
      <div key={d} className={`day ${isToday ? "today" : ""}`} onClick={() => openPopup(fullDate)}>
        <div className="day-number" style={isToday ? { color: "#FFD700" } : {}}>{d}</div>
        {eventList.length > 0 && (
          <div className="event-list">
            {eventList.map((ev, idx) => (
              <div key={idx} className="event-box" style={{ background: ev.color }} title={ev.text}>
                {ev.text}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="calendar-container">
      <div className="calendar-wrapper">
        <div className="calendar-header">
          <button onClick={goToPrevMonth}>◀</button>
          <h2>{monthNames[month]} {year}</h2>
          <button onClick={goToNextMonth}>▶</button>
        </div>

        <div className="weekdays">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div>
          <div>Thu</div><div>Fri</div><div>Sat</div>
        </div>

        <div className="days">{calendarGrid}</div>
      </div>

      {popupOpen && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3>Events for: {selectedDate}</h3>

            <div className="popup-input-row">
              <input
                type="text"
                value={popupEventInput}
                onChange={(e) => setPopupEventInput(e.target.value)}
                placeholder="Enter event title..."
                onKeyDown={(e) => e.key === "Enter" && handlePopupAddOne()}
              />
              <button className="popup-add-btn" onClick={handlePopupAddOne}>Add</button>
            </div>

            <div className="popup-event-list">
              {popupTempEvents.length === 0 && <div className="popup-empty">No events yet — add one above.</div>}
              {popupTempEvents.map((ev, idx) => (
                <div key={idx} className="popup-event-item">
                  <div className="popup-event-color" style={{ background: ev.color }} />
                  <div className="popup-event-text">{ev.text}</div>
                  <button className="popup-event-delete" onClick={() => handlePopupRemoveOne(idx)}>✕</button>
                </div>
              ))}
            </div>

            <div className="popup-actions">
              <button className="popup-btn add-btn" onClick={handlePopupSaveAll}>Save All</button>
              <button className="popup-btn delete-btn-popup" onClick={handleDeleteAllForDate}>Delete All</button>
            </div>

            <button className="close-btn" onClick={() => setPopupOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventCalendar;
