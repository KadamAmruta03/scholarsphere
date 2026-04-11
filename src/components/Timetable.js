import React, { useState, useEffect } from "react";
import "./Timetable.css";
import api from "../utils/api";

function Timetable() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [table, setTable] = useState(
    Array(6)
      .fill()
      .map(() => Array(6).fill(""))
  );
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"

  // Load timetable from MySQL
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/timetable");
        const rows = Array.isArray(res.data) ? res.data : [];
        const next = Array(6)
          .fill()
          .map(() => Array(6).fill(""));

        rows.forEach((r) => {
          const dayIndex = Number(r.day_index);
          const periodIndex = Number(r.period_index);
          if (!Number.isFinite(dayIndex) || !Number.isFinite(periodIndex)) return;
          if (!next[periodIndex] || next[periodIndex][dayIndex] === undefined) return;
          next[periodIndex][dayIndex] = r.subject || "";
        });

        setTable(next);
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("Failed to load timetable", err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Save timetable (debounced) with visual indicator
  useEffect(() => {
    if (!loaded) return;

    setSaveStatus("saving");
    const t = setTimeout(() => {
      api
        .post("/api/timetable", { table })
        .then(() => {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        })
        .catch((err) => {
          if (process.env.NODE_ENV === "development") console.error("Failed to save timetable", err);
          setSaveStatus("error");
        });
    }, 600);

    return () => clearTimeout(t);
  }, [table, loaded]);

  const handleChange = (dayIndex, timeIndex, value) => {
    const updated = [...table];
    updated[timeIndex] = [...updated[timeIndex]];
    updated[timeIndex][dayIndex] = value;
    setTable(updated);
  };

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <h2>Timetable</h2>
        <span
          className={`timetable-save-indicator ${saveStatus}`}
          title={
            saveStatus === "saving"
              ? "Saving to database..."
              : saveStatus === "saved"
              ? "Saved to database"
              : saveStatus === "error"
              ? "Failed to save — will retry on next edit"
              : ""
          }
        >
          {saveStatus === "saving" && "⏳ Saving..."}
          {saveStatus === "saved" && "✅ Saved"}
          {saveStatus === "error" && "🔴 Save failed"}
        </span>
      </div>

      <div className="timetable-grid">
        <div className="timetable-row timetables-days">
          <div className="timetable-cell empty"></div>
          {days.map((day, i) => (
            <div key={i} className="timetable-cell day">
              {day}
            </div>
          ))}
        </div>

        {Array.from({ length: 6 }).map((_, timeIndex) => (
          <div key={timeIndex} className="timetable-row">
            <div className="timetable-cell time-label">
              {`Period ${timeIndex + 1}`}
            </div>

            {days.map((_, dayIndex) => (
              <div key={dayIndex} className="timetable-cell editable">
                <input
                  type="text"
                  placeholder="subject"
                  value={table[timeIndex][dayIndex]}
                  onChange={(e) =>
                    handleChange(dayIndex, timeIndex, e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Timetable;
