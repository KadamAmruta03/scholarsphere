import React, { useEffect, useMemo, useState } from "react";
import "./StudyContainer.css";
import "./ExpenseTracker.css";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement } from "chart.js";
import { Pie, Line } from "react-chartjs-2";
import api from "../utils/api";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement);

const CATEGORY_OPTIONS = [
  "Food", "Transport", "Groceries", "Rent", "Utilities", "Internet / WiFi",
  "Tuition / Coaching", "Books & Stationery", "Online Courses", "Subscriptions",
  "Medical / Pharmacy", "Gym / Sports / Hobbies", "Movies / Entertainment",
  "Travel / Outings", "Gifts / Special Occasions", "Savings / Investments",
  "Loan / EMIs", "Personal", "Shopping", "Donations / Charity",
  "Unexpected / Miscellaneous", "Other"
];

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "NetBanking", "Other"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfWeekISO = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().slice(0, 10);
};
const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function ExpenseTracker() {
  const [items, setItems] = useState([]);
  const [weeklyBudget, setWeeklyBudget] = useState(0);
  const [form, setForm] = useState({ amount: "", category: "", payment: "Cash", date: todayISO(), notes: "" });
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const refreshExpenses = async () => {
    try {
      const res = await api.get("/api/expenses");
      const nextItems = Array.isArray(res.data?.items) ? res.data.items : [];
      setItems(nextItems);
      setWeeklyBudget(Number(res.data?.weeklyBudget || 0));
    } catch (err) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === "development") console.error("Failed to load expenses", err);
    }
  };

  useEffect(() => {
    refreshExpenses();
  }, []);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const resetForm = () => setForm({ amount: "", category: "", payment: "Cash", date: todayISO(), notes: "" });

  const addExpense = async () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      return;
    }

    try {
      await api.post("/api/expenses", {
        amount: Number(form.amount),
        category: form.category || "Other",
        payment: form.payment || "Cash",
        date: form.date || todayISO(),
        notes: form.notes || "",
      });
      resetForm();
      refreshExpenses();
    } catch (err) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === "development") console.error("Failed to add expense", err);
    }
  };

  const startEdit = (it) => {
    setEditingId(it.id);
    setForm({ amount: String(it.amount), category: it.category, payment: it.payment, date: it.date, notes: it.notes });
    setShowModal(true);
  };

  const saveEdit = async () => {
    try {
      await api.put(`/api/expenses/${editingId}`, {
        amount: Number(form.amount),
        category: form.category || "Other",
        payment: form.payment || "Cash",
        date: form.date || todayISO(),
        notes: form.notes || "",
      });
      setEditingId(null);
      setShowModal(false);
      resetForm();
      refreshExpenses();
    } catch (err) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === "development") console.error("Failed to update expense", err);
    }
  };

  const deleteItem = async (id) => {
    try {
      await api.delete(`/api/expenses/${id}`);
      refreshExpenses();
    } catch (err) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === "development") console.error("Failed to delete expense", err);
    }
  };

  const saveBudget = async (val) => {
    const newBudget = Number(val);
    if (!Number.isFinite(newBudget) || newBudget < 0) return;

    setWeeklyBudget(newBudget);
    try {
      await api.post("/api/expenses/budget", { weeklyBudget: newBudget });
    } catch (err) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === "development") console.error("Failed to save weekly budget", err);
    }
  };

  // Totals and charts (same logic as before)
  const totals = useMemo(() => {
    const today = todayISO();
    const weekStart = startOfWeekISO();
    const monthKey = new Date().toISOString().slice(0, 7);

    let totalToday = 0, totalWeek = 0, totalMonth = 0;
    const catTotals = {};

    items.forEach((it) => {
      const itMonth = it.date.slice(0, 7);
      if (it.date === today) totalToday += it.amount;
      if (it.date >= weekStart) totalWeek += it.amount;
      if (itMonth === monthKey) totalMonth += it.amount;
      catTotals[it.category] = (catTotals[it.category] || 0) + it.amount;
    });

    return { totalToday, totalWeek, totalMonth, catTotals };
  }, [items]);

  const weekDays = useMemo(() => {
    const start = new Date(startOfWeekISO());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const dailyData = useMemo(() => {
    const map = {};
    weekDays.forEach((d) => (map[d] = 0));
    items.forEach((it) => {
      if (map.hasOwnProperty(it.date)) map[it.date] += it.amount;
    });
    return weekDays.map((d) => map[d]);
  }, [items, weekDays]);

  const pieData = useMemo(() => {
    const labels = Object.keys(totals.catTotals);
    const data = labels.map((k) => totals.catTotals[k]);
    return { labels, datasets: [{ data, backgroundColor: ["#0B3D91","#1A1A40","#4B1D3F","#3A0CA3","#5A1E76","#5C2E58","#8B0000","#6A040F","#7F2B1D","#8B4513","#654321","#0F5132","#1F4529","#00332A","#003F5C","#2C3E50","#4A4A4A"] }] };
  }, [totals.catTotals]);

  const lineData = useMemo(() => ({
    labels: weekDays.map((d) => new Date(d).toLocaleDateString("en-IN", { weekday: "short" })),
    datasets: [{ label: "Daily", data: dailyData, borderWidth: 2, tension: 0.4, fill: false, borderColor: "white", pointBackgroundColor: "white", pointBorderColor: "white" }],
  }), [weekDays, dailyData]);

  const budgetUsedPercentage = Math.min(100, Math.round((totals.totalWeek / (weeklyBudget || 1)) * 100));

  return (
    <div className="et-page-wrapper">
      <div className="et-background-fixed"></div>
      <div className="et-content-container">
        <div className="study-left">
          <div className="et-header">
            <div>
              <h1 className="et-title">Expense Tracker</h1>
              <p className="et-sub">Manage money wisely — monitor expenses, control spending, and stay balanced.</p>
            </div>
            <div className="et-budget">
              <label>Weekly Budget</label>
              <input
                type="number"
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(Number(e.target.value || 0))}
                onBlur={(e) => saveBudget(e.target.value)}
                className="et-budget-input"
                min={0}
              />
            </div>
          </div>
        </div>

        {/* Input Panel */}
        <div className="et-controls">
          <input name="amount" className="et-input" placeholder="Amount (₹)" value={form.amount} onChange={onChange} />
          <select name="category" className="et-select" value={form.category} onChange={onChange}>
            <option value="">Select Category</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="payment" className="et-select" value={form.payment} onChange={onChange}>
            {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input name="date" type="date" className="et-input" value={form.date} onChange={onChange} />
          <input name="notes" className="et-input" placeholder="Notes (optional)" value={form.notes} onChange={onChange} />
          <button className="et-add" onClick={addExpense}>+ Add</button>
        </div>

        {/* Summary & Charts */}
        <div className="et-grid">
          <div className="et-cards">
            <div className="et-card">
              <div className="et-card-title">Today</div>
              <div className="et-card-value">{formatCurrency(totals.totalToday)}</div>
            </div>
            <div className="et-card">
              <div className="et-card-title">This Week</div>
              <div className="et-card-value">{formatCurrency(totals.totalWeek)}</div>
              <div className="et-small">Used: {budgetUsedPercentage}%</div>
              <div className="et-progress">
                <div className="et-progress-bar" style={{ width: `${budgetUsedPercentage}%`, background: budgetUsedPercentage >= 100 ? "#ef4444" : budgetUsedPercentage >= 80 ? "#f59e0b" : "#10b981" }} />
              </div>
            </div>
            <div className="et-card">
              <div className="et-card-title">This Month</div>
              <div className="et-card-value">{formatCurrency(totals.totalMonth)}</div>
            </div>
            <div className="et-card">
              <div className="et-card-title">Transactions</div>
              <div className="et-card-value">{items.length}</div>
            </div>
          </div>

          <div className="et-charts">
            <div className="et-chart-box">
              <h4 className="chart-title">Category Breakdown</h4>
              <div className="chart-wrap">{Object.keys(totals.catTotals).length ? <Pie data={pieData} /> : <div className="chart-empty">No data yet</div>}</div>
            </div>
            <div className="et-chart-box">
              <h4 className="chart-title">Last 7 Days</h4>
              <div className="chart-wrap">
                <Line data={lineData} options={{ plugins: { legend: { display: false } }, scales: { x: { ticks: { color: "white" }, grid: { color: "rgba(255,255,255,0.2)" } }, y: { ticks: { color: "white" }, grid: { color: "rgba(255,255,255,0.2)" } } } }} />
              </div>
            </div>
          </div>
        </div>

        {/* Expense List */}
        <div className="et-list">
          {items.map((it) => (
            <div className="et-row" key={it.id}>
              <div className="et-left">
                <div className="et-amount">{formatCurrency(it.amount)}</div>
                <div className="et-meta">
                  <div className="et-cat">{it.category}</div>
                  <div className="et-date">{it.date}</div>
                  <div className="et-note">{it.notes}</div>
                </div>
              </div>
              <div className="et-right">
                <button className="et-btn" onClick={() => startEdit(it)}>Edit</button>
                <button className="et-btn del" onClick={() => deleteItem(it.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Modal */}
        {showModal && (
          <div className="et-modal">
            <div className="et-modal-box">
              <h3>Edit expense</h3>
              <input name="amount" className="et-input" placeholder="Amount" value={form.amount} onChange={onChange} />
              <select name="category" className="et-select" value={form.category} onChange={onChange}>
                <option value="">Select Category</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select name="payment" className="et-select" value={form.payment} onChange={onChange}>
                {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input name="date" type="date" className="et-input" value={form.date} onChange={onChange} />
              <input name="notes" className="et-input" placeholder="Notes (optional)" value={form.notes} onChange={onChange} />
              <div className="et-modal-actions">
                <button className="et-add" onClick={saveEdit}>Save</button>
                <button className="et-btn del" onClick={() => { setShowModal(false); setEditingId(null); resetForm(); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
