import React, { useState, useEffect } from "react";
import "./MarksAnalytics.css";
import { Line } from "react-chartjs-2";
import api from "../utils/api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function MarksAnalytics() {
  const [exams, setExams] = useState([]);
  const [newExam, setNewExam] = useState("");
  const [selectedExam, setSelectedExam] = useState(null);
  const [analyticsExam, setAnalyticsExam] = useState(null);

  const refreshMarks = async () => {
    try {
      const res = await api.get("/api/marks");
      setExams(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === "development") console.error("Failed to load marks", err);
      setExams([]);
    }
  };

  useEffect(() => {
    refreshMarks();
  }, []);

  const addExam = () => {
    if (!newExam.trim()) {
      return;
    }

    (async () => {
      try {
        await api.post("/api/marks/exams", { examName: newExam.trim() });
        setNewExam("");
        refreshMarks();
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to add exam", err);
      }
    })();
  };

  const deleteExam = (examIndex) => {
    const examId = exams[examIndex]?.id;
    if (!examId) return;
    if (selectedExam === examIndex) setSelectedExam(null);
    if (analyticsExam === examIndex) setAnalyticsExam(null);

    (async () => {
      try {
        await api.delete(`/api/marks/exams/${examId}`);
        refreshMarks();
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to delete exam", err);
      }
    })();
  };

  const addSubject = (examIndex, subjectName) => {
    if (!subjectName.trim()) {
      return;
    }
    const examId = exams[examIndex]?.id;
    if (!examId) return;

    (async () => {
      try {
        await api.post(`/api/marks/exams/${examId}/subjects`, { subjectName: subjectName.trim() });
        refreshMarks();
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to add subject", err);
      }
    })();
  };

  const updateSubjectLocal = (examIndex, subjIndex, field, value) => {
    setExams((prev) =>
      prev.map((ex, ei) =>
        ei === examIndex
          ? {
              ...ex,
              subjects: (ex.subjects || []).map((s, si) => (si === subjIndex ? { ...s, [field]: value } : s)),
            }
          : ex
      )
    );
  };

  const deleteSubject = (examIndex, subjIndex) => {
    const subjectId = exams[examIndex]?.subjects?.[subjIndex]?.id;
    if (!subjectId) return;

    (async () => {
      try {
        await api.delete(`/api/marks/subjects/${subjectId}`);
        refreshMarks();
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to delete subject", err);
      }
    })();
  };

  const persistSubject = (subjectId, subj) => {
    if (!subjectId) return;
    api
      .put(`/api/marks/subjects/${subjectId}`, {
        subjectName: subj.name,
        obtainedMarks: subj.obtained,
        totalMarks: subj.total,
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to update subject", err);
      });
  };

  const lineChartData = (examIndex) => {
    const subjects = exams[examIndex].subjects;
    return {
      labels: subjects.map((s) => s.name || "Unnamed"),
      datasets: [
        {
          label: "Obtained Marks",
          data: subjects.map((s) => Number(s.obtained) || 0),
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.2)",
          borderWidth: 2,
          pointBackgroundColor: "white",
        },
        {
          label: "Total Marks",
          data: subjects.map((s) => Number(s.total) || 0),
          borderColor: "#ccc",
          backgroundColor: "rgba(200,200,200,0.2)",
          borderWidth: 2,
          pointBackgroundColor: "#ccc",
        },
      ],
    };
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { labels: { color: "white", font: { size: 12 } } },
    },
    scales: {
      x: { ticks: { color: "white" }, grid: { color: "rgba(255,255,255,0.2)" } },
      y: { beginAtZero: true, ticks: { color: "white" }, grid: { color: "rgba(255,255,255,0.2)" } },
    },
  };

  return (
      <div className="ma-page-wrapper">
      <div className="ma-background-fixed"></div>
      <div className="study-root">
        <div className="study-left">
          <div className="et-header">
            <div>
              <h1 className="et-title">Marks Analytics</h1>
              <p className="et-sub">Understand your performance — analyze marks, identify strengths, and improve results.</p>
            </div>
          </div>

          <div className="add-subject">
            <input
              type="text"
              placeholder="Add new exam..."
              value={newExam}
              onChange={(e) => setNewExam(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExam()}
            />
            <button onClick={addExam}>+ Add</button>
          </div>

          <div className="exam-tabs">
            {exams.map((exam, index) => (
              <div key={index} className="exam-tab-group">
                <button
                  className={`exam-tab ${selectedExam === index && analyticsExam === null ? "active" : ""}`}
                  onClick={() => { setSelectedExam(index); setAnalyticsExam(null); }}
                >
                  {exam.name}{" "}
                  <span
                    style={{ marginLeft: "10px", cursor: "pointer", color: "#ffb4b4" }}
                    onClick={(e) => { e.stopPropagation(); deleteExam(index); }}
                  >
                    🗑
                  </span>
                </button>
                <button className="analytics-button" onClick={() => setAnalyticsExam(index)}>
                  Analytics
                </button>
              </div>
            ))}
          </div>

          <div className="exam-content">
            {analyticsExam !== null ? (
              <div className="chart-box" style={{ height: "300px" }}>
                <Line data={lineChartData(analyticsExam)} options={lineChartOptions} />
              </div>
            ) : selectedExam !== null ? (
              <>
                <div className="add-subject">
                  <input
                    type="text"
                    placeholder="Add new subject..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addSubject(selectedExam, e.target.value);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>

                <div className="unit-list">
                  <table>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Obtained</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams[selectedExam].subjects.map((subj, i) => (
                        <tr key={i}>
                          <td className="subject-cell">
                              <input
                                type="text"
                                value={subj.name}
                              onChange={(e) => updateSubjectLocal(selectedExam, i, "name", e.target.value)}
                              onBlur={() => persistSubject(subj.id, exams[selectedExam].subjects[i])}
                              />
                            <button className="delete-subject-inline" onClick={() => deleteSubject(selectedExam, i)}>
                              🗑
                            </button>
                          </td>
                          <td>
                              <input
                                type="number"
                                value={subj.obtained}
                              onChange={(e) => updateSubjectLocal(selectedExam, i, "obtained", e.target.value)}
                              onBlur={() => persistSubject(subj.id, exams[selectedExam].subjects[i])}
                              />
                          </td>
                          <td>
                              <input
                                type="number"
                                value={subj.total}
                              onChange={(e) => updateSubjectLocal(selectedExam, i, "total", e.target.value)}
                              onBlur={() => persistSubject(subj.id, exams[selectedExam].subjects[i])}
                              />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p style={{ color: "white" }}>Select an exam to manage subjects.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
