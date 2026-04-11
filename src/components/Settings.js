import React, { useState, useEffect } from "react";
import api from "../utils/api";
import "./Settings.css";
import Toast from "./Toast";

export default function Settings() {
  const [me, setMe] = useState({ id: null, email: "" });
  const userId = me?.id;
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });

  const showToast = (message, type = "info") => setToast({ open: true, message, type });

  const [profile, setProfile] = useState({
    fullName: "",
    age: "",
    birthdate: "",
    gender: "",
    institutionName: ""
  });

  // Load data from MySQL on Mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/me");
        setMe({ id: res.data?.id || null, email: res.data?.email || "" });
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Error loading user", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    api.get(`/api/profile/${userId}`)
      .then(res => {
        if (res.data.user_id) {
          // FIX: Prevent the "Day Back" timezone bug
          let formattedDate = "";
          if (res.data.birthdate) {
            const d = new Date(res.data.birthdate);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
          }

          setProfile({
            fullName: res.data.full_name || "",
            age: res.data.age || "",
            birthdate: formattedDate,
            gender: res.data.gender || "",
            institutionName: res.data.institution_name || ""
          });
        }
      })
      .catch(err => { if (process.env.NODE_ENV === "development") console.error("Error loading profile", err); });
  }, [userId]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/profile", {
        userId,
        ...profile
      });
      showToast("Profile updated", "success");
    } catch (err) {
      showToast("Failed to update profile", "error");
      if (process.env.NODE_ENV === "development") console.error(err);
    }
  };

  // --- NEW LOGOUT FUNCTION ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/auth"; // Redirects to Login/Auth page
  };

  return (
    <div className="settings-page-container">
      <div className="settings-card">
        <div className="settings-header">
          <h2>Academic Identity</h2>
          <p>Logged in as: <span className="highlight">{me.email}</span></p>
        </div>

        <form className="profile-form" onSubmit={handleSave}>
          <section className="form-section">
            <div className="section-title">Personal Details</div>
            
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                value={profile.fullName} 
                onChange={(e) => setProfile({...profile, fullName: e.target.value})} 
                required 
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Age</label>
                <input 
                  type="number" 
                  value={profile.age} 
                  onChange={(e) => setProfile({...profile, age: e.target.value})} 
                  placeholder="21"
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select 
                  value={profile.gender} 
                  onChange={(e) => setProfile({...profile, gender: e.target.value})}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Birthdate</label>
              <input 
                type="date" 
                value={profile.birthdate} 
                onChange={(e) => setProfile({...profile, birthdate: e.target.value})} 
              />
            </div>
          </section>

          <section className="form-section">
            <div className="section-title">Education</div>
            <div className="form-group">
              <label>Institution Name</label>
              <input 
                type="text" 
                value={profile.institutionName} 
                onChange={(e) => setProfile({...profile, institutionName: e.target.value})} 
                placeholder="College or School Name" 
              />
            </div>
          </section>

          <button type="submit" className="save-btn">Update Profile</button>
        </form>

        {/* --- NEW LOGOUT SECTION --- */}
        <div className="settings-footer">
          <hr className="divider" />
          <button onClick={handleLogout} className="logout-btn">
            Logout Account
          </button>
        </div>
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
