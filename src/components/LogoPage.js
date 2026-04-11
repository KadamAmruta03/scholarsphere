import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LogoPage.css";

const LogoPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/auth"); // Directly go to main app
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="logo-container">
      <h1 className="typing-text">Welcome to ScholarSphere!</h1>
    </div>
  );
};

export default LogoPage;
