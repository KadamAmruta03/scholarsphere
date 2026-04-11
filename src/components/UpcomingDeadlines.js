import React, { useEffect, useState } from "react";
import "./UpcomingDeadlines.css";
import api from "../utils/api";

function UpcomingDeadlines({ maxItems = 5 }) {
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const eventColors = [
    "#FFFFFF",
    "#FFF9C4",
    "#FFE0B2",
    "#FFCCBC",
    "#E1BEE7",
    "#B2EBF2",
    "#C8E6C9",
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/calendar");
        const rows = Array.isArray(res.data) ? res.data : [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allEvents = rows
          .map((r) => {
            const d = new Date(r.event_date);
            if (Number.isNaN(d.getTime())) return null;
            return { date: d, text: r.event_text };
          })
          .filter(Boolean)
          .filter((ev) => ev.date >= today)
          .sort((a, b) => a.date - b.date)
          .slice(0, maxItems);

        setUpcomingEvents(allEvents);
      } catch (error) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Error loading upcoming deadlines:", error);
        setUpcomingEvents([]);
      }
    })();
  }, [maxItems]);

  return (
    <div className="upcoming-container">
      <h3 className="upcoming-heading">Upcoming Deadlines</h3>

      {upcomingEvents.length === 0 ? (
        <p>No upcoming events!</p>
      ) : (
        <ul className="upcoming-list">
          {upcomingEvents.map((ev, idx) => (
            <li key={idx} className="upcoming-item">
              <div className="event-date-left">
                <span className="event-day">{ev.date.getDate()}</span>
                <span className="event-month">
                  {ev.date.toLocaleString("en-US", { month: "short" })}
                </span>
              </div>

              <div
                className="event-name-right"
                style={{ color: eventColors[idx % eventColors.length] }}
              >
                {ev.text}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UpcomingDeadlines;
