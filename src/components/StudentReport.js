import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./StudentReport.css";
import api from "../utils/api";

export default function StudentReport() {
  const reportRef = useRef();
  const currentYear = new Date().getFullYear();
  const [totalSpent, setTotalSpent] = useState(0);
  const [studyData, setStudyData] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [expRes, studyRes, marksRes, examsRes] = await Promise.all([
          api.get("/api/expenses"),
          api.get("/api/study"),
          api.get("/api/marks"),
          api.get("/api/exams"),
        ]);

        const items = Array.isArray(expRes.data?.items) ? expRes.data.items : [];
        const sum = items.reduce((acc, it) => acc + Number(it.amount || 0), 0);
        setTotalSpent(sum);
        setStudyData(Array.isArray(studyRes.data) ? studyRes.data : []);
        setMarksData(Array.isArray(marksRes.data) ? marksRes.data : []);
        setScheduleData(Array.isArray(examsRes.data) ? examsRes.data : []);
      } catch (err) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === "development") console.error("Failed to load report data", err);
      }
    })();
  }, []);

  const data = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- Process Marks & Performance ---
    const examReports = (marksData || []).map((exam) => {
      let totalObtained = 0, totalPossible = 0;
      exam.subjects?.forEach((s) => {
        totalObtained += Number(s.obtained || 0);
        totalPossible += Number(s.total || 0);
      });
      const percentage = totalPossible === 0 ? 0 : ((totalObtained / totalPossible) * 100).toFixed(1);

      const getGrade = (score) => {
        if (score >= 90) return { grade: "O", color: "#2ecc71" };
        if (score >= 80) return { grade: "A+", color: "#27ae60" };
        if (score >= 70) return { grade: "A", color: "#f1c40f" };
        if (score >= 60) return { grade: "B", color: "#e67e22" };
        return { grade: "C", color: "#e74c3c" };
      };

      return {
        name: exam.name,
        obtained: totalObtained,
        total: totalPossible,
        percentage,
        gradeInfo: getGrade(percentage)
      };
    });

    // --- Process Exam Schedule ---
    const upcomingExams = (scheduleData || [])
      .filter(ex => new Date(ex.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(ex => ({
        subjectName: ex.subject,
        date: ex.date,
        location: ex.location,
        rawDate: new Date(ex.date)
    }));

    // --- Process Syllabus Progress ---
    const subjectProgress = (studyData || []).map(subj => {
      let totalUnits = 0, notesDone = 0, learnDone = 0;
      if (subj.units && Array.isArray(subj.units)) {
        subj.units.forEach(u => {
          totalUnits++;
          if (u.notes) notesDone++;
          if (u.learn) learnDone++;
        });
      }
      return {
        name: subj.name,
        totalUnits,
        notesPercent: totalUnits === 0 ? 0 : Math.round((notesDone / totalUnits) * 100),
        learnPercent: totalUnits === 0 ? 0 : Math.round((learnDone / totalUnits) * 100),
        isPending: totalUnits === 0
      };
    });

    // --- Calculations ---
    const avgSyllabus = subjectProgress.length === 0 ? 0 :
      Math.round(subjectProgress.reduce((acc, curr) => acc + curr.learnPercent, 0) / subjectProgress.length);

    return { examReports, subjectProgress, totalSpent, avgSyllabus, upcomingExams, today };
  }, [marksData, scheduleData, studyData, totalSpent]);

  const exportPDF = () => {
    const element = reportRef.current;
    html2canvas(element, { 
      scale: 2, 
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollY: -window.scrollY
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`Student_Audit_${currentYear}.pdf`);
    });
  };

  return (
    <div className="report-page-wrapper">
      <div className="report-background-fixed"></div>
      <div className="report-container">
        <div className="report-actions">
          <button className="export-btn" onClick={exportPDF}>
            📥 Export Performance Audit (PDF)
          </button>
        </div>

        <div className="report-paper" ref={reportRef}>
          <div className="report-header">
            <div>
              <h1>Academic Performance Audit</h1>
              <p>Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p><strong>Academic Year:</strong> {currentYear}</p>
              <p><strong>Status:</strong> Official Audit</p>
            </div>
          </div>

          <div className="report-grid">
            <div className="stat-card">
              <h3>Avg. Syllabus Mastery</h3>
              <p className="grade-big">{data.avgSyllabus}%</p>
              <span className="desc">Learning Completion Score</span>
            </div>
            <div className="stat-card">
              <h3>Total Expenditure</h3>
              <p className="grade-big">₹{data.totalSpent}</p>
              <span className="desc">Total Tracked Expenses</span>
            </div>
          </div>

          <div className="report-section printable-section">
            <h3>Knowledge Dominion (Skill Tree)</h3>
            <div className="skill-tree-viz">
              {data.subjectProgress.length > 0 ? (
                data.subjectProgress.map((s, i) => {
                  const isMastered = Number(s.learnPercent) === 100;
                  const isStarted = Number(s.learnPercent) > 0 || Number(s.notesPercent) > 0;
                  return (
                    <div key={i} className="skill-node-container">
                      {i < data.subjectProgress.length - 1 && <div className="tree-connector-line"></div>}
                      <div className={`skill-hex ${isMastered ? 'mastered' : isStarted ? 'active' : 'locked'}`}>
                        <div className="hex-inner">
                          <span className="hex-percent">{s.learnPercent}%</span>
                        </div>
                      </div>
                      <p className="hex-label">{s.name}</p>
                    </div>
                  );
                })
              ) : (
                <p className="no-data-msg">No syllabus data to map.</p>
              )}
            </div>

            <div className="tree-legend">
              <div className="legend-item"><span className="dot locked"></span> Locked</div>
              <div className="legend-item"><span className="dot active"></span> In Progress</div>
              <div className="legend-item"><span className="dot mastered"></span> Mastered</div>
            </div>
          </div>

          <div className="report-section printable-section">
            <h3>Upcoming Examination Schedule</h3>
            {data.upcomingExams.length > 0 ? (
              <table className="report-table">
                <thead>
                  <tr><th>Subject</th><th>Exam Date</th><th>Location</th><th>Remaining</th></tr>
                </thead>
                <tbody>
                  {data.upcomingExams.map((ex, i) => {
                    const daysLeft = Math.ceil((ex.rawDate - data.today) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={i}>
                        <td><strong>{ex.subjectName}</strong></td>
                        <td>{ex.date}</td>
                        <td>{ex.location || "N/A"}</td>
                        <td><span className={`badge ${daysLeft <= 2 ? 'pending' : 'in-progress'}`}>{daysLeft === 0 ? "TODAY" : `${daysLeft} Days Left`}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : ( <div className="no-data-msg">No upcoming exams found.</div> )}
          </div>

          <div className="report-section printable-section">
            <h3>Past Performance Breakdown</h3>
            {data.examReports.length > 0 ? (
              data.examReports.map((exam, index) => (
                <div key={index} className="exam-summary-box" style={{ borderLeft: `8px solid ${exam.gradeInfo.color}` }}>
                  <div className="exam-main-info">
                    <h4 style={{ margin: 0 }}>{exam.name}</h4>
                    <p style={{ margin: '5px 0', color: '#666' }}>Score: {exam.obtained} / {exam.total}</p>
                  </div>
                  <div className="exam-grade-display" style={{ color: exam.gradeInfo.color }}>
                    {exam.percentage}% ({exam.gradeInfo.grade})
                  </div>
                </div>
              ))
            ) : ( <div className="no-data-msg">No past marks data available.</div> )}
          </div>

          <div className="report-section printable-section">
            <h3>Syllabus Coverage Audit</h3>
            <table className="report-table">
              <thead>
                <tr><th>Subject</th><th>Notes Status</th><th>Mastery Level</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.subjectProgress.map((s, i) => (
                  <tr key={i}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.isPending ? "0%" : `${s.notesPercent}%`}</td>
                    <td>{s.isPending ? "0%" : `${s.learnPercent}%`}</td>
                    <td>{s.isPending ? (<span className="badge pending">NO DATA</span>) : Number(s.learnPercent) === 100 ? (<span className="badge completed">VERIFIED</span>) : (<span className="badge in-progress">IN PROGRESS</span>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-footer"><p>End of Performance Audit Report</p></div>
        </div>
      </div>
    </div>
  );
}
