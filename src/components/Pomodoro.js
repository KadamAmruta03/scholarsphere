import React, { useEffect, useState } from "react";
import "./Pomodoro.css";
import { useTimer } from "../context/TimerContext";

const Pomodoro = () => {
  const { timeLeft, isRunning, startTimer, stopTimer, resetTimer } = useTimer();

  const [focus, setFocus] = useState(25);
  const [breakTime, setBreakTime] = useState(5);
  const [mode, setMode] = useState("FOCUS");

  const radius = 95;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (timeLeft !== 0) return;
  
    if (mode === "FOCUS") {
      setMode("BREAK");
      resetTimer(breakTime * 60);
      startTimer(breakTime * 60);
    } else {
      setMode("FOCUS");
      resetTimer(focus * 60);
    }
    
    // This comment below tells ESLint to stop complaining about missing dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);
  

  const handleStartPause = () => {
    if (isRunning) {
      stopTimer();
    } else {
      const duration = timeLeft > 0 ? timeLeft : (mode === "FOCUS" ? focus * 60 : breakTime * 60);
      startTimer(duration);
    }
  };

  const handleReset = () => {
    stopTimer();
    setMode("FOCUS");
    resetTimer(focus * 60);
  };

  const formatTime = () => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const totalDuration = mode === "FOCUS" ? focus * 60 : breakTime * 60;
  const offset = circumference - (timeLeft / totalDuration) * circumference;

  return (
    <div className="pomodoro-dashboard">
      <div className="ff-card">
        <div className="ff-header">
          <div className="ff-logo">⏱ {mode === "FOCUS" ? "FOCUS MODE" : "BREAK TIME"}</div>
        </div>

        <div className="ff-main">
          <div className="ff-timer-wrapper">
            <svg width="220" height="220" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="110" cy="110" r={radius} className="ff-track" />
              <circle
                cx="110"
                cy="110"
                r={radius}
                className={`ff-progress ${mode === "BREAK" ? "break-stroke" : ""}`}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="ff-time">{formatTime()}</div>
          </div>

          <div className="ff-content">
            <h2>{mode === "FOCUS" ? "KEEP IT UP!" : "TAKE A REST"}</h2>
            <p>
              {mode === "FOCUS" 
                ? "Stay focused on your task. You're doing great." 
                : "Step away from the screen and recharge."}
            </p>

            <div className="ff-actions">
              <button className="ff-start" onClick={handleStartPause}>
                {isRunning ? "PAUSE" : "▶ START"}
              </button>
              <button className="ff-reset" onClick={handleReset}>↻</button>
            </div>
          </div>
        </div>

        <div className="ff-footer">
          <div className="option-box">
            <label>FOCUS MINUTES</label>
            <input
              type="number"
              value={focus}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setFocus(val);
                if (mode === "FOCUS" && !isRunning) resetTimer(val * 60);
              }}
            />
          </div>

          <div className="option-box">
            <label>BREAK MINUTES</label>
            <input
              type="number"
              value={breakTime}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setBreakTime(val);
                if (mode === "BREAK" && !isRunning) resetTimer(val * 60);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pomodoro;