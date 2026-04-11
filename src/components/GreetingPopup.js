import React, { useEffect, useState } from "react";
import "./GreetingPopup.css";

// Greetings (fixed order = country mapping)
const greetingsByTime = {
  morning: [
    "शुभ प्रभात 🌸",          // India
    "Good Morning 🌞",        // Global
    "Buenos días ☀️",        // Spain
    "Bonjour 🌼",             // France
    "おはようございます 🌅", // Japan
  ],
  afternoon: [
    "नमस्कार ☀️",
    "Good Afternoon ☀️",
    "Buenas tardes 🌤️",
    "Bon après-midi 🌤️",
    "こんにちは 🌤️",
  ],
  evening: [
    "शुभ संध्या 🌆",          // India - Evening
    "Good Evening 🌆",
    "Buenas tardes 🌆",
    "Bonsoir 🌆",
    "こんばんは 🌆",
  ],
  night: [
    "शुभ रात्रि 🌙",          // India - Night
    "Good Night 🌙",
    "Buenas noches 🌙",
    "Bonne nuit 🌙",
    "おやすみなさい 🌙",
  ],
};

// Country class by index
const countryClass = ["india", "global", "spain", "france", "japan"];

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function GreetingPopup() {
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    const userId = localStorage.getItem("user_id") || "guest";

    const today = new Date().toDateString();
    const shownKey = `greetingShownToday_${userId}`;
    const shown = sessionStorage.getItem(shownKey);

    // show only once per day per user
    if (shown === today) return;
    sessionStorage.setItem(shownKey, today);

    const timeOfDay = getTimeOfDay();
    const greetings = greetingsByTime[timeOfDay];
    let current = 0;

    const showNext = () => {
      if (current >= greetings.length) {
        setIndex(-1);
        return;
      }

      setIndex(current);

      setTimeout(() => {
        setIndex(-1);
        setTimeout(() => {
          current++;
          showNext();
        }, 300);
      }, 2000);
    };

    showNext();
  }, []);

  if (index === -1) return null;

  return (
    <div className={`toast ${countryClass[index]}`}>
      <div className="toast-content">
        <p>{greetingsByTime[getTimeOfDay()][index]}</p>
      </div>
    </div>
  );
}

export default GreetingPopup;
