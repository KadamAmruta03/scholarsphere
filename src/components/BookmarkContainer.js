import React, { useState, useEffect } from "react";
import "./StudyContainer.css";
import "./ExpenseTracker.css";
import "./BookmarkContainer.css";
import api from "../utils/api";

export default function BookmarkContainer() {
  const [bookmarks, setBookmarks] = useState([]);
  const [form, setForm] = useState({ title: "", url: "", notes: "" });
  const [editingId, setEditingId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const refreshBookmarks = async () => {
    try {
      const res = await api.get("/api/bookmarks");
      setBookmarks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === "development") console.error("Failed to load bookmarks", err);
    }
  };

  useEffect(() => {
    refreshBookmarks();
  }, []);

  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => setForm({ title: "", url: "", notes: "" });

  const addBookmark = () => {
    (async () => {
      if (!form.title.trim() || !form.url.trim()) return;
      try {
        await api.post("/api/bookmarks", {
          title: form.title.trim(),
          url: form.url.trim(),
          notes: form.notes.trim(),
        });
        resetForm();
        refreshBookmarks();
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to add bookmark", err);
      }
    })();
  };

  const startEdit = (bm) => {
    setEditingId(bm.id);
    setForm({ title: bm.title, url: bm.url, notes: bm.notes });
    setShowEditModal(true);
  };

  const saveEdit = () => {
    (async () => {
      if (!form.title.trim() || !form.url.trim()) return;
      try {
        await api.put(`/api/bookmarks/${editingId}`, {
          title: form.title.trim(),
          url: form.url.trim(),
          notes: form.notes.trim(),
        });
        setEditingId(null);
        setShowEditModal(false);
        resetForm();
        refreshBookmarks();
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to update bookmark", err);
      }
    })();
  };

  const deleteBookmark = (id) => {
    (async () => {
      try {
        await api.delete(`/api/bookmarks/${id}`);
        refreshBookmarks();
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to delete bookmark", err);
      }
    })();
  };

  return (
      <div className="bm-page-wrapper">
      <div className="bm-background-fixed"></div>
      <div className="study-root">
        <div className="study-left">
          <div
            className="et-header"
          >
            <div>
              <h1 className="et-title">Bookmark Manager</h1>
              <p className="et-sub">
                Save what matters — organize learning resources and access them instantly.
              </p>
            </div>

            <div className="bc-budget">
              <label>Total</label>
              <input className="bc-budget-input" value={bookmarks.length} readOnly />
            </div>
          </div>

          <div className="bc-controls-bm">
            <input
              name="title"
              className="bc-input bc-small"
              placeholder="Title"
              value={form.title}
              onChange={onChange}
            />
            <input
              name="url"
              className="bc-input bc-small"
              placeholder="URL"
              value={form.url}
              onChange={onChange}
            />
            <input
              name="notes"
              className="bc-input bc-large"
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={onChange}
            />
            <button className="bc-add bc-add-big" onClick={addBookmark}>
              + Add
            </button>
          </div>

          <div className="bookmark-list">
            {bookmarks.length === 0 && <div className="empty-text">No bookmarks yet</div>}

            {bookmarks.map((b) => (
              <div className="et-row bm-row" key={b.id}>
                <div className="et-left bm-left">
                  <div>
                    <div className="et-amount bm-title-text">{b.title || "Untitled"}</div>
                    <div className="et-meta">
                      <div className="et-cat bm-url">
                        <a href={b.url} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
                          {b.url}
                        </a>
                      </div>
                      {b.notes && <div className="et-note bm-notes">{b.notes}</div>}
                    </div>
                  </div>
                </div>

                <div className="et-right bm-right">
                  <button className="et-btn" onClick={() => startEdit(b)}>Edit</button>
                  <button className="et-btn del" onClick={() => deleteBookmark(b.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          {showEditModal && (
            <div className="popup-overlay">
              <div className="popup-box">
                <h3 style={{ margin: 0, color: "palegoldenrod" }}>Edit Bookmark</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", opacity: 0.8 }}>Title</label>
                  <input name="title" className="bc-input" placeholder="Title" value={form.title} onChange={onChange} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", opacity: 0.8 }}>URL</label>
                  <input name="url" className="bc-input" placeholder="URL" value={form.url} onChange={onChange} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", opacity: 0.8 }}>Notes</label>
                  <textarea
                    name="notes"
                    className="bc-input"
                    placeholder="Notes"
                    style={{ minHeight: "80px", resize: "none", fontFamily: "inherit" }}
                    value={form.notes}
                    onChange={onChange}
                  />
                </div>

                <div className="bc-modal-actions">
                  <button className="bc-add" onClick={saveEdit}>Save</button>
                  <button
                    className="et-btn del"
                    onClick={() => { setShowEditModal(false); setEditingId(null); resetForm(); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
