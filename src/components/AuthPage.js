// src/components/AuthPage.js
import React, { useState } from "react";
import "./AuthPage.css";
import { Link } from "react-router-dom";
import api, { API_BASE_URL } from "../utils/api";

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); 
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    try {
      // Call backend API
      const response = await api.post("/api/login", {
        email,
        password,
      });

      const { token, user } = response.data;

      // Store token and user in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user_id", String(user?.id || ""));

      // Redirect to home
      window.location.href = "/home";
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error(err);
      const serverMessage = err?.response?.data?.message;
      if (serverMessage) {
        setMessage(serverMessage);
      } else {
        setMessage(`Login failed: cannot reach API (${API_BASE_URL}).`);
      }
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side */}
      <div className="auth-left">
        <h1>Welcome to the<br />future you!</h1>
        <h2>Study so hard that you never have to introduce yourself.</h2>
      </div>

      {/* Right Side */}
      <div className="auth-card">
        <div className="form-container">
          <h2 className="auth-title">Login</h2>

          <input
            className="auth-input"
            type="email"
            placeholder="ex@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="ex"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="auth-button" onClick={handleLogin}>
            Login
          </button>

          {message && <p style={{ marginTop: "10px", color: "#fff" }}>{message}</p>}
          <p style={{ marginTop: "10px", color: "#fff" }}>
  Don't have an account? <Link to="/signup">Signup</Link>
  <br />
  <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
    You can use the written email and password to view the project.
  </span>
</p>

        </div>
      </div>
    </div>
  );
}

export default AuthPage;
