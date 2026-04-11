import React, { useState, useEffect } from "react";
import "./StudyContainer.css";
import api from "../utils/api";

export default function StudyContainer() {
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [newUnit, setNewUnit] = useState("");

  // Load subjects from MySQL for this user
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/study");
        setSubjects(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("Failed to load study data", err);
        setSubjects([]);
      }
    })();
  }, []);


  // =============================
  // SUBJECT FUNCTIONS
  // =============================
  const addSubject = async () => {
    if (!newSubject.trim()) {
      return;
    }

    try {
      const res = await api.post("/api/study/subjects", { name: newSubject.trim() });
      setSubjects((prev) => [...prev, res.data]);
      setNewSubject("");
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Failed to add subject", err);
    }
  };

  const deleteSubject = async (index) => {
    const subject = subjects[index];
    if (!subject?.id) return;

    const previousSubjects = subjects;
    const previousSelected = selectedSubject;
    setSubjects((prev) => prev.filter((_, i) => i !== index));
    setSelectedSubject((prevSelected) => {
      if (prevSelected === null) return null;
      if (prevSelected === index) return null;
      if (prevSelected > index) return prevSelected - 1;
      return prevSelected;
    });

    try {
      await api.delete(`/api/study/subjects/${subject.id}`);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Failed to delete subject", err);
      setSubjects(previousSubjects);
      setSelectedSubject(previousSelected);
    }
  };

  // =============================
  // UNIT FUNCTIONS
  // =============================
  const addUnit = async () => {
    if (!newUnit.trim() || selectedSubject === null) {
      return;
    }

    const subject = subjects[selectedSubject];
    if (!subject?.id) return;

    try {
      const res = await api.post("/api/study/units", { subjectId: subject.id, unitText: newUnit.trim() });
      setSubjects((prev) =>
        prev.map((s, i) =>
          i === selectedSubject ? { ...s, units: [...(s.units || []), { id: res.data.id, text: res.data.text, notes: false, learn: false }] } : s
        )
      );
      setNewUnit("");
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Failed to add unit", err);
    }
  };

  const editUnit = (unitIndex, text) => {
    const unit = subjects[selectedSubject]?.units?.[unitIndex];
    if (!unit?.id) return;

    const previousSubjects = subjects;
    setSubjects((prev) =>
      prev.map((s, i) =>
        i === selectedSubject
          ? {
              ...s,
              units: (s.units || []).map((u, ui) => (ui === unitIndex ? { ...u, text } : u)),
            }
          : s
      )
    );

    api.put(`/api/study/units/${unit.id}`, { unitText: text }).catch((err) => {
      if (process.env.NODE_ENV === "development") console.error("Failed to update unit", err);
      setSubjects(previousSubjects);
    });
  };

  const deleteUnit = (unitIndex) => {
    const unit = subjects[selectedSubject]?.units?.[unitIndex];
    if (!unit?.id) return;

    const previousSubjects = subjects;
    setSubjects((prev) =>
      prev.map((s, i) =>
        i === selectedSubject
          ? { ...s, units: (s.units || []).filter((_, ui) => ui !== unitIndex) }
          : s
      )
    );

    api.delete(`/api/study/units/${unit.id}`).catch((err) => {
      if (process.env.NODE_ENV === "development") console.error("Failed to delete unit", err);
      setSubjects(previousSubjects);
    });
  };

  const toggleUnitField = (unitIndex, field) => {
    const unit = subjects[selectedSubject]?.units?.[unitIndex];
    if (!unit?.id) return;

    const newState = !unit[field];
    const previousSubjects = subjects;

    setSubjects((prev) =>
      prev.map((s, i) =>
        i === selectedSubject
          ? {
              ...s,
              units: (s.units || []).map((u, ui) => (ui === unitIndex ? { ...u, [field]: newState } : u)),
            }
          : s
      )
    );

    api.put(`/api/study/units/${unit.id}`, { [field]: newState }).catch((err) => {
      if (process.env.NODE_ENV === "development") console.error("Failed to toggle unit", err);
      setSubjects(previousSubjects);
    });
  };

  const getSubjectProgress = (subject) => {
    if (!subject.units || subject.units.length === 0) return 0;
    const total = subject.units.length;
    const completed = subject.units.filter((u) => u.notes && u.learn).length;
    return Math.round((completed / total) * 100);
  };

  return (
      <div className="sc-page-wrapper">
      <div className="sc-background-fixed"></div>

      <div className="study-root">
        <div className="study-left">
          <div className="et-header">
            <div>
              <h1 className="et-title">Syllabus Analytics</h1>
              <p className="et-sub">
                Know what’s next — organize your syllabus and never miss a topic.
              </p>
            </div>
          </div>

          <div className="add-subject">
            <input
              type="text"
              placeholder="Add new subject..."
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
            />
            <button onClick={addSubject}>+ Add</button>
          </div>

          <div className="subject-progress-list">
            {subjects.map((subject, index) => (
              <div
                key={index}
                className={`subject-item ${selectedSubject === index ? "active" : ""}`}
              >
                <div
                  className="subject-header"
                  onClick={() => setSelectedSubject(index)}
                >
                  <strong>{subject.name}</strong>
                  <button
                    className="delete-subject"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSubject(index);
                    }}
                  >
                    🗑
                  </button>
                </div>

                <div style={{ marginTop: "8px", fontSize: "0.85rem" }}>
                  {getSubjectProgress(subject)}% completed
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${getSubjectProgress(subject)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {selectedSubject !== null && subjects[selectedSubject]?.units && (
            <div className="subject-table">
              <h3 style={{ color: "white", marginBottom: "15px" }}>
                {subjects[selectedSubject].name} Units
              </h3>

              <div className="add-subject">
                <input
                  type="text"
                  placeholder="Add new unit..."
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUnit()}
                />
                <button onClick={addUnit}>+ Add</button>
              </div>

              <div className="unit-list">
                <table>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Notes</th>
                      <th>Learn</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects[selectedSubject].units.map((unit, uIndex) => (
                      <tr key={uIndex}>
                        <td
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => editUnit(uIndex, e.target.textContent)}
                        >
                          {unit.text}
                        </td>
                        <td onClick={() => toggleUnitField(uIndex, "notes")}>
                          {unit.notes ? "✔️" : "❌"}
                        </td>
                        <td onClick={() => toggleUnitField(uIndex, "learn")}>
                          {unit.learn ? "✔️" : "❌"}
                        </td>
                        <td>
                          <button onClick={() => deleteUnit(uIndex)}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
