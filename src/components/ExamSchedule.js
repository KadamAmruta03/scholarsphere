import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import "./StudyContainer.css";
import "./ExpenseTracker.css";
import "./ExamSchedule.css";
import api from "../utils/api";

export default function ExamSchedule() {
  const [form, setForm] = useState({
    subject: "",
    date: "",
    startTime: "00:00",
    endTime: "00:00",
    location: "",
  });
  const [exams, setExams] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Load exams for this user from MySQL
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/exams");
        setExams(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("Failed to load exams", err);
        setExams([]);
      }
    })();
  }, []);

  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () =>
    setForm({
      subject: "",
      date: "",
      startTime: "00:00",
      endTime: "00:00",
      location: "",
    });

  const handleAddOrSave = async () => {
    if (!form.subject.trim() || !form.date.trim()) {
      return;
    }

    const payload = {
      subject: form.subject.trim(),
      date: form.date,
      startTime: form.startTime || "00:00",
      endTime: form.endTime || "00:00",
      location: form.location.trim(),
    };

    try {
      if (editingId) {
        await api.put(`/api/exams/${editingId}`, payload);
      } else {
        await api.post("/api/exams", payload);
      }

      const res = await api.get("/api/exams");
      setExams(Array.isArray(res.data) ? res.data : []);

      // Only clear form after successful save
      resetForm();
      setEditingId(null);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Failed to save exam", err);
    }
  };

  const startEdit = (exam) => {
    setEditingId(exam.id);
    setForm({
      subject: exam.subject,
      date: exam.date,
      startTime: exam.startTime,
      endTime: exam.endTime,
      location: exam.location,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const previousExams = exams;
    setExams((prev) => prev.filter((x) => x.id !== id));

    try {
      await api.delete(`/api/exams/${id}`);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Failed to delete exam", err);
      setExams(previousExams);
    }
  };

  const daysRemaining = (examDate) => {
    if (!examDate) return "N/A";
    const today = new Date();
    const target = new Date(examDate + "T00:00:00");
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = target - todayStart;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Completed";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 Day Left";
    return `${diffDays} Days Left`;
  };

  return (
    <div className="exm-page-wrapper">
      <div className="exm-background-fixed"></div>

      <div className="study-root">
        <div className="study-left">
          <div
            className="et-header"
          >
            <div>
              <h1 className="et-title">Exam Schedule</h1>
              <p className="et-sub">
                Stay prepared — track exam dates, timings, and never miss an assessment.
              </p>
            </div>

            <div className="exm-count">
              <label>Total</label>
              <input className="exm-count-input" value={exams.length} readOnly />
            </div>
          </div>

          <div className="exm-controls">
            <input
              name="subject"
              className="exm-input exm-subject"
              placeholder="Subject"
              value={form.subject}
              onChange={onChange}
            />
            <input
              name="date"
              type="date"
              className="exm-input exm-date"
              value={form.date}
              onChange={onChange}
            />
            <input
              name="startTime"
              type="time"
              className="exm-input exm-time"
              value={form.startTime}
              onChange={onChange}
            />
            <input
              name="endTime"
              type="time"
              className="exm-input exm-time"
              value={form.endTime}
              onChange={onChange}
            />
            <input
              name="location"
              className="exm-input exm-location"
              placeholder="Location"
              value={form.location}
              onChange={onChange}
            />

            <button className="exm-add-btn" onClick={handleAddOrSave}>
              {editingId ? "Update" : "+ Add"}
            </button>
          </div>

          <div className="exm-table-wrap">
            {exams.length === 0 ? (
              <div className="exm-empty">No exams scheduled yet</div>
            ) : (
              <table className="exm-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Location</th>
                    <th>Countdown</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {exams
                    .slice()
                    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
                    .map((ex) => (
                      <tr key={ex.id}>
                        <td className="td-subject">{ex.subject}</td>
                        <td>{ex.date || "N/A"}</td>
                        <td>{ex.startTime || "00:00"}</td>
                        <td>{ex.endTime || "00:00"}</td>
                        <td className="td-location">{ex.location || "—"}</td>
                        <td>
                          <span className="exm-count-badge">{daysRemaining(ex.date)}</span>
                        </td>
                        <td className="td-actions">
                          <FaEdit className="exm-icon edit" onClick={() => startEdit(ex)} />
                          <FaTrash className="exm-icon del" onClick={() => handleDelete(ex.id)} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
