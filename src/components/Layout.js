import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import "./Layout.css";

import {
  FaHome,
  FaPen,
  FaCalendarAlt,
  FaTasks,
  FaBook,
  FaChartLine,
  FaClock,
  FaFolder,
  FaMoneyBill,
  FaChartBar,
  FaCog, // Added Settings Icon
} from "react-icons/fa";

const messages = [
  "🤔 – \"What's the meaning of life? Check your to-do list, maybe it's in there.\"",
  "🍪 – \"We saw you open the fridge. Now open us. We're less caloric.\"",
  "👾 – \"Your high score is lonely. Don’t ghost it!\"",
  "📱 – \"We know you're doomscrolling. We're a better kind of FOMO.\"",
  "🤏 – \"Just one quick thing, then back to your scheduled nap.\"",
  "🙈 – \"Did you accidentally install us? Chill, it’s okay to peek.\"",
  "➗ – \"Math slid into your DMs: ‘You ignored me, bro.’\"",
  "📝 – \"That assignment won’t do itself. We swear we tried.\"",
  "💎 – \"Your future self is flexing. Add that note now, don’t cap.\"",
  "⏰ – \"Your procrastination is vibing. But don’t let it catch you.\"",
  "🧠 – \"Neurons are asking for a workout. Time to flex that brain.\"",
  "🔥 – \"Your streak sent us an SOS. Keep the vibes going.\"",
  "🌈 – \"Open us. Your dopamine deserves a snack.\"",
  "🪑 – \"Your desk looks sad. Give it some company.\"",
  "☕ – \"Coffee’s watching. Study while it’s hot.\"",
  "💪 – \"One step, one note, one vibe. You got this.\"",
  "📚 – \"Homework calling. Spoiler: It’s actually fun if you vibe with it.\"",
  "😴 – \"You deserve a nap… after completing just one task.\"",
  "👀 – \"Other students are leveling up. Don’t let FOMO hit you.\"",
  "🏆 – \"Complete this task and your legend status will pop.\"",
  "🛌 – \"Your bed misses you, but your goals won’t reach themselves.\"",
  "🍩 – \"Fuel up! Even legends need donuts before conquering notes.\"",
  "⏳ – \"Deadline coming? Nah, you got this. Just vibe and submit.\"",
  "⚡ – \"Your brain called. It wants some energy… maybe a coffee?\"",
  "🌟 – \"Hey superstar! You’re doing epic, keep it rolling!\""
];

function Layout() {
  const [time, setTime] = useState(new Date());
  const [messageIndex, setMessageIndex] = useState(0);
  const [animate, setAnimate] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Floating messages
  useEffect(() => {
    const msgTimer = setInterval(() => {
      setAnimate(true);
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
        setAnimate(false);
      }, 4000); // matches animation duration
    }, 4000);
    return () => clearInterval(msgTimer);
  }, []);

  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isActive = (path) => location.pathname === path;

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header-left">
          <p className="time-text">{formattedTime}</p>
          <h1 className="today-text">Today</h1>
          <p className="date-text">{formattedDate}</p>
        </div>

        {/* Floating notification */}
        <div className="header-messages">
          <span
            key={messageIndex}
            className={`float-message ${animate ? "animate" : ""}`}
          >
            "{messages[messageIndex]}"
          </span>
        </div>
      </header>

      <div className="sidebar">
        <FaHome
          className={`side-icon ${isActive("/home") ? "active" : ""}`}
          title="Home"
          onClick={() => navigate("/home")}
        />
        <FaPen
          className={`side-icon ${isActive("/home/journal") ? "active" : ""}`}
          title="Journal"
          onClick={() => navigate("/home/journal")}
        />
        <FaCalendarAlt
          className={`side-icon ${isActive("/home/calendar") ? "active" : ""}`}
          title="Calendar"
          onClick={() => navigate("/home/calendar")}
        />
        <FaTasks
          className={`side-icon ${isActive("/home/remainder") ? "active" : ""}`}
          title="Reminders"
          onClick={() => navigate("/home/remainder")}
        />
        <FaBook
          className={`side-icon ${isActive("/home/study") ? "active" : ""}`}
          title="Study"
          onClick={() => navigate("/home/study")}
        />
        <FaChartLine
          className={`side-icon ${isActive("/home/marks") ? "active" : ""}`}
          title="Analytics"
          onClick={() => navigate("/home/marks")}
        />
        <FaClock
          className={`side-icon ${isActive("/home/exam") ? "active" : ""}`}
          title="Exam"
          onClick={() => navigate("/home/exam")}
        />
        <FaFolder
          className={`side-icon ${isActive("/home/resources") ? "active" : ""}`}
          title="Resources"
          onClick={() => navigate("/home/resources")}
        />
        <FaMoneyBill
        className={`side-icon ${isActive("/home/expense") ? "active" : ""}`}
        title="Expense Tracker"
        onClick={() => navigate("/home/expense")}
        />

        <FaChartBar 
          className={`side-icon ${isActive("/home/results") ? "active" : ""}`} 
          title="Master Report" 
          onClick={() => navigate("/home/results")} 
        />

        {/* Settings Icon Added Here */}
        <FaCog
          className={`side-icon ${isActive("/home/settings") ? "active" : ""}`}
          title="Settings"
          onClick={() => navigate("/home/settings")}
        />

      </div>

      <main className="page-body">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;