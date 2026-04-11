import React, { useState, useEffect } from "react";
import { FaBook } from "react-icons/fa";
import "./YearActivity.css";
import api from "../utils/api";

const YearActivity = () => {
  const [highlightedDays, setHighlightedDays] = useState([]);
  const currentYear = new Date().getFullYear();

  // Load highlighted days from MySQL
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/year-activity", { params: { year: currentYear } });
        setHighlightedDays(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to load yearly activity", err);
        setHighlightedDays([]);
      }
    })();
  }, [currentYear]);

  // Highlight today
  const handleHighlightToday = () => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const diff = today - yearStart;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay) + 1;

    toggleDay(dayOfYear);
  };

  // Toggle a day
  const toggleDay = (dayOfYear) => {
    (async () => {
      try {
        const res = await api.post("/api/year-activity/toggle", { year: currentYear, dayOfYear });
        const highlighted = !!res.data?.highlighted;
        setHighlightedDays((prev) =>
          highlighted ? [...prev, dayOfYear] : prev.filter((d) => d !== dayOfYear)
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to toggle yearly activity", err);
      }
    })();
  };

  const months = [
    { name: "Jan", days: 31 },
    { name: "Feb", days: 28 },
    { name: "Mar", days: 31 },
    { name: "Apr", days: 30 },
    { name: "May", days: 31 },
    { name: "Jun", days: 30 },
    { name: "Jul", days: 31 },
    { name: "Aug", days: 31 },
    { name: "Sep", days: 30 },
    { name: "Oct", days: 31 },
    { name: "Nov", days: 30 },
    { name: "Dec", days: 31 },
  ];

  if (
    (currentYear % 4 === 0 && currentYear % 100 !== 0) ||
    currentYear % 400 === 0
  ) {
    months[1].days = 29;
  }

  let dayCounter = 0;

  return (
    <div className="year-activity-container">
      <div className="activity-header">
        <FaBook className="study-icon" />
        <h3 className="year-title">{currentYear} Yearly Study Activity</h3>
        <button className="highlight-btn" onClick={handleHighlightToday}>
          ✓
        </button>
      </div>

      <div className="months-row">
        {months.map((month, mIndex) => {
          const startDay = dayCounter + 1;
          const endDay = dayCounter + month.days;
          dayCounter = endDay;

          return (
            <div className="month-column" key={mIndex}>
              <div className="month-name">{month.name}</div>
              <div className="days-column">
                {Array.from({ length: month.days }).map((_, index) => {
                  const dayOfYear = startDay + index;
                  const isHighlighted = highlightedDays.includes(dayOfYear);

                  return (
                    <div
                      key={dayOfYear}
                      className={`day-square ${
                        isHighlighted ? "highlighted" : "unhighlighted"
                      }`}
                      onClick={() => toggleDay(dayOfYear)}
                      title={
                        isHighlighted
                          ? "Completed"
                          : "Click to mark as done"
                      }
                    ></div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YearActivity;
