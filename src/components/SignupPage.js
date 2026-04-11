import React, { useState } from "react";
import "./AuthPage.css"; // reuse same styles
import api from "../utils/api";

function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Please fill all fields.");
      return;
    }

    try {
      const response = await api.post("/api/signup", {
        email,
        password,
      });

      setMessage(response.data.message);
      // Optionally redirect to login after signup
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Signup failed!");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
      <h1>Welcome to the<br />future you!</h1>
        <h2>Study so hard that you never have to introduce yourself.</h2>
      </div>

      <div className="auth-card">
        <div className="form-container">
          <h2 className="auth-title">Signup</h2>

          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="auth-button" onClick={handleSignup}>
            Signup
          </button>

          {message && <p style={{ marginTop: "10px", color: "#fff" }}>{message}</p>}

          <p style={{ marginTop: "10px", color: "#fff" }}>
            Already have an account? <a href="/auth">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
