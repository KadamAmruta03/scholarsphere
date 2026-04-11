import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const TimerContext = createContext();

export const TimerProvider = ({ children }) => {
  const [endTime, setEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isRunning || !endTime) return;

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(intervalRef.current);
      }
      
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, endTime]);

  const startTimer = (seconds) => {
    setEndTime(Date.now() + seconds * 1000);
    setIsRunning(true);
  };

  const stopTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setEndTime(null);
  };

  const resetTimer = (seconds) => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setEndTime(null);
    setTimeLeft(seconds);
  };

  return (
    <TimerContext.Provider value={{ timeLeft, isRunning, startTimer, stopTimer, resetTimer }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);