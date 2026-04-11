import React, { useEffect, useState } from "react";
import "./WeeklyStrengthMap.css";
import api from "../utils/api";

export default function WeeklyStrengthMap() {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/study");
        setSubjects(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to load study data", error);
        setSubjects([]);
      }
    })();
  }, []);

  // =========================
  // Metric calculations
  // =========================
  const calculateMetrics = () => {
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return { focus: 0, consistency: 0, completionRate: 0, productivity: 0 };
    }

    let totalUnits = 0,
      totalCompleted = 0,
      totalNotes = 0,
      totalLearn = 0;

    subjects.forEach((subject) => {
      if (Array.isArray(subject.units)) {
        subject.units.forEach((unit) => {
          totalUnits++;
          if (unit.notes) totalNotes++;
          if (unit.learn) totalLearn++;
          if (unit.notes && unit.learn) totalCompleted++;
        });
      }
    });

    const focus = totalUnits ? Math.round((totalNotes / totalUnits) * 100) : 0;
    const consistency = totalUnits ? Math.round((totalLearn / totalUnits) * 100) : 0;
    const completionRate = totalUnits ? Math.round((totalCompleted / totalUnits) * 100) : 0;
    const productivity = Math.round((focus + consistency + completionRate) / 3);

    return { focus, consistency, completionRate, productivity };
  };

  const metrics = calculateMetrics();

  // =========================
  // Subject difficulty
  // =========================
  const getDifficulty = (subject) => {
    const totalUnits = Array.isArray(subject.units) ? subject.units.length : 0;
    const completedUnits = Array.isArray(subject.units)
      ? subject.units.filter((u) => u.notes && u.learn).length
      : 0;

    if (totalUnits === 0) return "Pending";

    const ratio = completedUnits / totalUnits;
    if (ratio >= 0.7) return "Low Difficulty";
    if (ratio >= 0.4) return "Medium Difficulty";
    return "High Difficulty";
  };

  return (
    <div className="weekly-strength-map">
      <h2>Weekly Strength Map</h2>

      {["focus", "consistency", "completionRate", "productivity"].map((key) => (
        <div className="metric" key={key}>
          <span>
            <b>{key.charAt(0).toUpperCase() + key.slice(1)}</b>
          </span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${metrics[key]}%` }}>
              {metrics[key]}%
            </div>
          </div>
        </div>
      ))}

      <h3>Subject Difficulty Detector</h3>
      <div className="subnjectinputs">
        <ul>
          {subjects.length === 0 && <li>No subjects added yet.</li>}
          {subjects.map((subject, idx) => (
            <li key={idx}>
              {subject.name} — {getDifficulty(subject)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
