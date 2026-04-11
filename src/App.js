import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LogoPage from "./components/LogoPage";
import AuthPage from "./components/AuthPage";
import SignupPage from "./components/SignupPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Home from "./components/Home";
import Journal from "./components/Journal";
import EventCalendar from "./components/EventCalendar";
import ExamSchedule from "./components/ExamSchedule";
import Countdown from "./components/Countdown";
import MarksAnalytics from "./components/MarksAnalytics";
import Remainder from "./components/Remainder";
import StudyContainer from "./components/StudyContainer";
import BookmarkContainer from "./components/BookmarkContainer";
import ExpenseTracker from "./components/ExpenseTracker";
import StudentReport from "./components/StudentReport";
import Settings from "./components/Settings"; // Added this import
import "./index.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LogoPage />} />

        {/* Login/Signup page */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected home pages */}
        <Route
          path="/home/*"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="journal" element={<Journal />} />
          <Route path="calendar" element={<EventCalendar />} />
          <Route path="remainder" element={<Remainder />} />
          <Route path="study" element={<StudyContainer />} />
          <Route path="exam" element={<ExamSchedule />} />
          <Route path="marks" element={<MarksAnalytics />} />
          <Route path="countdown" element={<Countdown />} />
          <Route path="resources" element={<BookmarkContainer />} />
          <Route path="expense" element={<ExpenseTracker />} />
          <Route path="results" element={<StudentReport />} />
          
          {/* Added the settings route here */}
          <Route path="settings" element={<Settings />} /> 
          
        </Route>
      </Routes>
    </Router>
  );
}
export default App;
