import React from "react";
import "./Home.css";
import YearActivity from "./YearActivity";
import Timetable from "./Timetable";
import Countdown from "./Countdown";
import WeeklyStrengthMap from "./WeeklyStrengthMap";
import Pomodoro from "./Pomodoro";
import UpcomingDeadlines from "./UpcomingDeadlines";
import GreetingPopup from "./GreetingPopup";

function Home() {
  return (
    <div className="home-page-wrapper">
      <div className="page-background-fixed"></div>

      <div className="home-container">
        <GreetingPopup />

        <div className="page-content">
          <div className="row-full">
            <YearActivity />
          </div>

          <div className="row-flex">
            <div className="col-main">
              <Timetable />
            </div>
            <div className="col-side">
              <Pomodoro />
            </div>
          </div>

          <div className="row-flex">
            <div className="col-main">
              <WeeklyStrengthMap />
            </div>
            <div className="col-side stack-vertical">
              <UpcomingDeadlines />
              <Countdown />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
