const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  // Lightweight .env loader so this project can run without extra dependencies.
  // In production you can still set env vars via your hosting platform.
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const eq = trimmed.indexOf("=");
    if (eq === -1) return;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  });
}

loadEnvFile();

const app = express();

const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

function getDefaultDevOrigins() {
  // Helpful for "On Your Network" testing without editing env vars.
  // Production deployments should still set CORS_ORIGIN explicitly.
  const os = require("os");
  const origins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);

  try {
    const ifaces = os.networkInterfaces();
    Object.values(ifaces).forEach((entries) => {
      (entries || []).forEach((e) => {
        if (e && e.family === "IPv4" && !e.internal && e.address) {
          origins.add(`http://${e.address}:3000`);
        }
      });
    });
  } catch (_) {
    // noop
  }

  return Array.from(origins);
}

const corsOriginsRaw = (process.env.CORS_ORIGIN || "").trim();
const allowedOrigins =
  corsOriginsRaw.length > 0
    ? corsOriginsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : getDefaultDevOrigins();

const corsOptions = {
  origin(origin, cb) {
    // Allow non-browser requests (curl/postman) that don't send Origin.
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes("*")) return cb(null, true);

    // Case-insensitive check and ignore trailing slashes
    const normalizedOrigin = origin.toLowerCase().replace(/\/$/, "");
    const isAllowed = allowedOrigins.some((allowed) => {
      const normalizedAllowed = allowed.toLowerCase().replace(/\/$/, "");
      return normalizedAllowed === normalizedOrigin;
    });

    if (isAllowed) return cb(null, true);
    return cb(new Error(`CORS blocked origin: ${origin}`), false);
  },
};

// eslint-disable-next-line no-console
console.log("CORS allowed origins:", allowedOrigins.join(", "));

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// Handle trailing slashes: if a request comes in for /api/signup/ it redirects (307) to /api/signup
// This prevents 405 errors caused by automatic redirect-to-get behavior.
app.use((req, res, next) => {
  if (req.path !== "/" && req.path.endsWith("/")) {
    const query = req.url.slice(req.path.length);
    const safepath = req.path.slice(0, -1);
    // Use 307 to preserve the POST method during the redirect
    return res.redirect(307, safepath + query);
  }
  next();
});

// Minimal request logging for debugging LAN/CORS issues.
app.use((req, _res, next) => {
  const origin = req.headers.origin || "";
  // eslint-disable-next-line no-console
  console.log(`${req.method} ${req.path} origin=${origin}`);
  next();
});

// Ensure preflights are handled consistently (Express v5 does not accept "*").
app.options(/.*/, cors(corsOptions));

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "UNCHARTED@#32",
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || "study_habit_db",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
});

const db = pool.promise();

async function query(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

// Automatic Table Creation on Startup
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL, last_login DATE DEFAULT NULL);
CREATE TABLE IF NOT EXISTS user_profiles (user_id INT NOT NULL PRIMARY KEY, full_name VARCHAR(255), age INT, birthdate DATE, gender VARCHAR(20), institution_name VARCHAR(255), FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS user_bookmarks (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255) NOT NULL, url TEXT NOT NULL, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS user_budgets (user_id INT NOT NULL PRIMARY KEY, weekly_budget DECIMAL(10,2) DEFAULT 0.00, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS user_expenses (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, amount DECIMAL(10,2) NOT NULL, category VARCHAR(100), payment_method VARCHAR(50), expense_date DATE NOT NULL, notes TEXT, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS journal_entries (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, entry_date VARCHAR(50) NOT NULL, entry_text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS reminders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, text VARCHAR(255), completed TINYINT(1) DEFAULT 0, week_number INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS timetable (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, day_index INT, period_index INT, subject VARCHAR(100), FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS user_exams (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, subject VARCHAR(255) NOT NULL, exam_date VARCHAR(20) NOT NULL, start_time VARCHAR(10) DEFAULT '00:00', end_time VARCHAR(10) DEFAULT '00:00', location VARCHAR(255), FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS exam_names (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, exam_name VARCHAR(255), FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS exam_marks (id INT AUTO_INCREMENT PRIMARY KEY, exam_id INT, subject_name VARCHAR(255), obtained_marks DECIMAL(5,2), total_marks DECIMAL(5,2), FOREIGN KEY (exam_id) REFERENCES exam_names(id));
CREATE TABLE IF NOT EXISTS study_subjects (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, name VARCHAR(255) NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS study_units (id INT AUTO_INCREMENT PRIMARY KEY, subject_id INT, unit_text VARCHAR(255) NOT NULL, notes TINYINT(1) DEFAULT 0, learn TINYINT(1) DEFAULT 0, FOREIGN KEY (subject_id) REFERENCES study_subjects(id));
CREATE TABLE IF NOT EXISTS user_calendar (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, event_date VARCHAR(20) NOT NULL, event_text VARCHAR(255) NOT NULL, event_color VARCHAR(20), FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS user_countdowns (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255) NOT NULL, target_date DATETIME NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS yearly_activity (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, day_of_year INT, year INT, FOREIGN KEY (user_id) REFERENCES users(id));
`;

async function initializeDatabase() {
  const host = process.env.DB_HOST || process.env.MYSQLHOST || "localhost";
  const database = process.env.DB_NAME || process.env.MYSQLDATABASE || "study_habit_db";
  
  // eslint-disable-next-line no-console
  console.log(`[Auto-Init] Checking database schema on ${host}/${database}...`);
  // eslint-disable-next-line no-console
  console.log(`[Auto-Init] Available Env Keys: ${Object.keys(process.env).join(", ")}`);

  try {
    const connection = await pool.promise().getConnection();
    
    // We run queries one by one
    const queries = SCHEMA_SQL.split(';').map(q => q.trim()).filter(Boolean);
    for (const q of queries) {
      await connection.query(q);
    }
    
    connection.release();
    // eslint-disable-next-line no-console
    console.log("[Auto-Init] Database schema verified/initialized successfully.");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Auto-Init] Database initialization failed:", err.message);
  }
}

// Call initialization
initializeDatabase();

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/status", async (_req, res) => {
  try {
    await query("SELECT 1 AS ok");
    return res.json({ ok: true, db: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("DB status check failed:", err.message);
    return res.status(500).json({ ok: false, db: false });
  }
});

app.get("/api/me", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ message: "Invalid user" });

    const rows = await query("SELECT id, email FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "User not found" });
    return res.json({ id: rows[0].id, email: rows[0].email });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load user" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Missing credentials" });

  try {
    const results = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    if (!results || results.length === 0) return res.status(400).json({ message: "User not found" });

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Missing credentials" });

  const hashed = await bcrypt.hash(password, 10);
  try {
    await query("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashed]);
    return res.json({ message: "User created" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Database error" });
  }
});

// Get profile data (requires JWT; userId must match token)
app.get("/api/profile/:userId", authRequired, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId)) return res.status(400).json({ message: "Invalid userId" });
  if (Number(req.user?.id) !== userId) return res.status(403).json({ message: "Forbidden" });

  try {
    const results = await query("SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1", [userId]);
    if (!results || results.length === 0) return res.json({});
    return res.json(results[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Database error" });
  }
});

// Save or update profile data (requires JWT; userId must match token)
app.post("/api/profile", authRequired, async (req, res) => {
  const { userId, fullName, age, birthdate, gender, institutionName } = req.body || {};
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId)) return res.status(400).json({ message: "Invalid userId" });
  if (Number(req.user?.id) !== numericUserId) return res.status(403).json({ message: "Forbidden" });

  const sql = `
    INSERT INTO user_profiles (user_id, full_name, age, birthdate, gender, institution_name)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      full_name = VALUES(full_name),
      age = VALUES(age),
      birthdate = VALUES(birthdate),
      gender = VALUES(gender),
      institution_name = VALUES(institution_name)
  `;

  try {
    await query(sql, [numericUserId, fullName, age, birthdate, gender, institutionName]);
    return res.json({ message: "Profile updated successfully!" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to save profile" });
  }
});

// ==============================
// BOOKMARKS (MySQL; per user)
// Tables: user_bookmarks
// ==============================
app.get("/api/bookmarks", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const rows = await query(
      "SELECT id, title, url, notes FROM user_bookmarks WHERE user_id = ? ORDER BY created_at DESC, id DESC",
      [userId]
    );
    return res.json(rows || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load bookmarks" });
  }
});

app.post("/api/bookmarks", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { title, url, notes } = req.body || {};
    if (!String(title || "").trim() || !String(url || "").trim()) {
      return res.status(400).json({ message: "Title and URL are required" });
    }

    const result = await query(
      "INSERT INTO user_bookmarks (user_id, title, url, notes) VALUES (?, ?, ?, ?)",
      [userId, String(title).trim(), String(url).trim(), String(notes || "").trim() || null]
    );
    const id = result?.insertId;
    const rows = await query("SELECT id, title, url, notes FROM user_bookmarks WHERE id = ? AND user_id = ?", [
      id,
      userId,
    ]);
    return res.json(rows?.[0] || { id, title, url, notes });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create bookmark" });
  }
});

app.put("/api/bookmarks/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const { title, url, notes } = req.body || {};
    if (!String(title || "").trim() || !String(url || "").trim()) {
      return res.status(400).json({ message: "Title and URL are required" });
    }

    const result = await query(
      "UPDATE user_bookmarks SET title = ?, url = ?, notes = ? WHERE id = ? AND user_id = ?",
      [String(title).trim(), String(url).trim(), String(notes || "").trim() || null, id, userId]
    );

    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });

    const rows = await query("SELECT id, title, url, notes FROM user_bookmarks WHERE id = ? AND user_id = ?", [
      id,
      userId,
    ]);
    return res.json(rows?.[0] || { id, title, url, notes });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update bookmark" });
  }
});

app.delete("/api/bookmarks/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await query("DELETE FROM user_bookmarks WHERE id = ? AND user_id = ?", [id, userId]);
    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete bookmark" });
  }
});

// ==============================
// EXPENSES (MySQL; per user)
// Tables: user_expenses, user_budgets
// ==============================
app.get("/api/expenses", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    const items = await query(
      `
        SELECT
          id,
          amount,
          category,
          payment_method AS payment,
          DATE_FORMAT(expense_date, "%Y-%m-%d") AS date,
          notes
        FROM user_expenses
        WHERE user_id = ?
        ORDER BY expense_date DESC, id DESC
      `,
      [userId]
    );

    const budgets = await query("SELECT weekly_budget FROM user_budgets WHERE user_id = ?", [userId]);
    const weeklyBudget = budgets?.length ? Number(budgets[0].weekly_budget || 0) : 0;

    const normalized = (items || []).map((it) => ({
      ...it,
      amount: Number(it.amount),
    }));

    return res.json({ items: normalized, weeklyBudget });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load expenses" });
  }
});

app.post("/api/expenses/budget", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const weeklyBudget = Number(req.body?.weeklyBudget || 0);
    if (!Number.isFinite(weeklyBudget) || weeklyBudget < 0) {
      return res.status(400).json({ message: "Invalid weeklyBudget" });
    }

    await query(
      `
        INSERT INTO user_budgets (user_id, weekly_budget)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE weekly_budget = VALUES(weekly_budget)
      `,
      [userId, weeklyBudget]
    );

    return res.json({ weeklyBudget });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to save weekly budget" });
  }
});

app.post("/api/expenses", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const amount = Number(req.body?.amount);
    const category = String(req.body?.category || "Other").trim() || "Other";
    const payment = String(req.body?.payment || "Cash").trim() || "Cash";
    const date = String(req.body?.date || "").trim();
    const notes = String(req.body?.notes || "").trim();

    if (!Number.isFinite(amount)) return res.status(400).json({ message: "Invalid amount" });
    if (!date) return res.status(400).json({ message: "Invalid date" });

    const result = await query(
      "INSERT INTO user_expenses (user_id, amount, category, payment_method, expense_date, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, amount, category, payment, date, notes || null]
    );

    const id = result?.insertId;
    const rows = await query(
      `
        SELECT id, amount, category, payment_method AS payment, DATE_FORMAT(expense_date, "%Y-%m-%d") AS date, notes
        FROM user_expenses
        WHERE id = ? AND user_id = ?
      `,
      [id, userId]
    );

    const item = rows?.[0] ? { ...rows[0], amount: Number(rows[0].amount) } : null;
    return res.json(item || { id, amount, category, payment, date, notes });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create expense" });
  }
});

app.put("/api/expenses/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const amount = Number(req.body?.amount);
    const category = String(req.body?.category || "Other").trim() || "Other";
    const payment = String(req.body?.payment || "Cash").trim() || "Cash";
    const date = String(req.body?.date || "").trim();
    const notes = String(req.body?.notes || "").trim();

    if (!Number.isFinite(amount)) return res.status(400).json({ message: "Invalid amount" });
    if (!date) return res.status(400).json({ message: "Invalid date" });

    const result = await query(
      "UPDATE user_expenses SET amount = ?, category = ?, payment_method = ?, expense_date = ?, notes = ? WHERE id = ? AND user_id = ?",
      [amount, category, payment, date, notes || null, id, userId]
    );

    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });

    const rows = await query(
      `
        SELECT id, amount, category, payment_method AS payment, DATE_FORMAT(expense_date, "%Y-%m-%d") AS date, notes
        FROM user_expenses
        WHERE id = ? AND user_id = ?
      `,
      [id, userId]
    );

    const item = rows?.[0] ? { ...rows[0], amount: Number(rows[0].amount) } : null;
    return res.json(item || { id, amount, category, payment, date, notes });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update expense" });
  }
});

app.delete("/api/expenses/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await query("DELETE FROM user_expenses WHERE id = ? AND user_id = ?", [id, userId]);
    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete expense" });
  }
});

// ==============================
// JOURNAL (MySQL; per user)
// Table: journal_entries
// ==============================
app.get("/api/journal", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const date = String(req.query?.date || "").trim();

    if (date) {
      const rows = await query(
        "SELECT id, entry_date, entry_text FROM journal_entries WHERE user_id = ? AND entry_date = ? ORDER BY id DESC LIMIT 1",
        [userId, date]
      );
      return res.json(rows?.[0] || null);
    }

    const rows = await query(
      "SELECT id, entry_date, entry_text FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC, id DESC",
      [userId]
    );
    return res.json(rows || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load journal" });
  }
});

app.post("/api/journal", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const entryDate = String(req.body?.entryDate || "").trim();
    const entryText = String(req.body?.entryText || "");
    if (!entryDate) return res.status(400).json({ message: "Missing entryDate" });

    const existing = await query(
      "SELECT id FROM journal_entries WHERE user_id = ? AND entry_date = ? ORDER BY id DESC LIMIT 1",
      [userId, entryDate]
    );

    if (existing?.length) {
      const id = existing[0].id;
      await query("UPDATE journal_entries SET entry_text = ? WHERE id = ? AND user_id = ?", [
        entryText,
        id,
        userId,
      ]);
      const rows = await query("SELECT id, entry_date, entry_text FROM journal_entries WHERE id = ? AND user_id = ?", [
        id,
        userId,
      ]);
      return res.json(rows?.[0] || { id, entry_date: entryDate, entry_text: entryText });
    }

    const result = await query(
      "INSERT INTO journal_entries (user_id, entry_date, entry_text) VALUES (?, ?, ?)",
      [userId, entryDate, entryText]
    );
    const id = result?.insertId;
    const rows = await query("SELECT id, entry_date, entry_text FROM journal_entries WHERE id = ? AND user_id = ?", [
      id,
      userId,
    ]);
    return res.json(rows?.[0] || { id, entry_date: entryDate, entry_text: entryText });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to save journal" });
  }
});

// ==============================
// REMINDERS (MySQL; per user)
// Table: reminders
// ==============================
function getWeekNumber(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((date - firstDay) / 86400000);
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

app.get("/api/reminders", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const week = Number(req.query?.week || getWeekNumber(new Date()));
    const rows = await query(
      "SELECT id, text, completed, week_number FROM reminders WHERE user_id = ? AND week_number = ? ORDER BY created_at DESC, id DESC",
      [userId, week]
    );
    const normalized = (rows || []).map((r) => ({ ...r, completed: !!r.completed }));
    return res.json({ week, reminders: normalized });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load reminders" });
  }
});

app.post("/api/reminders", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const text = String(req.body?.text || "").trim();
    const week = Number(req.body?.weekNumber || getWeekNumber(new Date()));
    if (!text) return res.status(400).json({ message: "Missing text" });

    const result = await query(
      "INSERT INTO reminders (user_id, text, completed, week_number) VALUES (?, ?, 0, ?)",
      [userId, text, week]
    );
    const id = result?.insertId;
    const rows = await query(
      "SELECT id, text, completed, week_number FROM reminders WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    const reminder = rows?.[0] ? { ...rows[0], completed: !!rows[0].completed } : null;
    return res.json(reminder || { id, text, completed: false, week_number: week });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create reminder" });
  }
});

app.put("/api/reminders/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const text = req.body?.text !== undefined ? String(req.body.text).trim() : undefined;
    const completed =
      req.body?.completed !== undefined ? (req.body.completed ? 1 : 0) : undefined;

    const existing = await query("SELECT id FROM reminders WHERE id = ? AND user_id = ?", [id, userId]);
    if (!existing?.length) return res.status(404).json({ message: "Not found" });

    if (text !== undefined) {
      await query("UPDATE reminders SET text = ? WHERE id = ? AND user_id = ?", [text, id, userId]);
    }
    if (completed !== undefined) {
      await query("UPDATE reminders SET completed = ? WHERE id = ? AND user_id = ?", [completed, id, userId]);
    }

    const rows = await query(
      "SELECT id, text, completed, week_number FROM reminders WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    const reminder = rows?.[0] ? { ...rows[0], completed: !!rows[0].completed } : null;
    return res.json(reminder || null);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update reminder" });
  }
});

app.delete("/api/reminders/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await query("DELETE FROM reminders WHERE id = ? AND user_id = ?", [id, userId]);
    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete reminder" });
  }
});

// ==============================
// TIMETABLE (MySQL; per user)
// Table: timetable
// ==============================
app.get("/api/timetable", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const rows = await query(
      "SELECT day_index, period_index, subject FROM timetable WHERE user_id = ?",
      [userId]
    );
    return res.json(rows || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load timetable" });
  }
});

app.post("/api/timetable", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const table = req.body?.table;

    if (!Array.isArray(table)) return res.status(400).json({ message: "Invalid table" });

    await query("DELETE FROM timetable WHERE user_id = ?", [userId]);

    for (let period = 0; period < table.length; period++) {
      const row = table[period];
      if (!Array.isArray(row)) continue;
      for (let day = 0; day < row.length; day++) {
        const subject = String(row[day] || "").trim();
        if (!subject) continue;
        // eslint-disable-next-line no-await-in-loop
        await query(
          "INSERT INTO timetable (user_id, day_index, period_index, subject) VALUES (?, ?, ?, ?)",
          [userId, day, period, subject]
        );
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to save timetable" });
  }
});

// ==============================
// EXAMS (SCHEDULE) (MySQL; per user)
// Table: user_exams
// ==============================
app.get("/api/exams", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const rows = await query(
      "SELECT id, subject, exam_date, start_time, end_time, location FROM user_exams WHERE user_id = ? ORDER BY id DESC",
      [userId]
    );
    const mapped = (rows || []).map((r) => ({
      id: r.id,
      subject: r.subject,
      date: r.exam_date,
      startTime: r.start_time,
      endTime: r.end_time,
      location: r.location,
    }));
    return res.json(mapped);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load exams" });
  }
});

app.post("/api/exams", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const subject = String(req.body?.subject || "").trim();
    const date = String(req.body?.date || "").trim();
    const startTime = String(req.body?.startTime || "00:00").trim() || "00:00";
    const endTime = String(req.body?.endTime || "00:00").trim() || "00:00";
    const location = String(req.body?.location || "").trim();
    if (!subject || !date) return res.status(400).json({ message: "Subject and date are required" });

    const result = await query(
      "INSERT INTO user_exams (user_id, subject, exam_date, start_time, end_time, location) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, subject, date, startTime, endTime, location || null]
    );
    const id = result?.insertId;
    return res.json({ id, subject, date, startTime, endTime, location });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create exam" });
  }
});

app.put("/api/exams/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const subject = String(req.body?.subject || "").trim();
    const date = String(req.body?.date || "").trim();
    const startTime = String(req.body?.startTime || "00:00").trim() || "00:00";
    const endTime = String(req.body?.endTime || "00:00").trim() || "00:00";
    const location = String(req.body?.location || "").trim();
    if (!subject || !date) return res.status(400).json({ message: "Subject and date are required" });

    const result = await query(
      "UPDATE user_exams SET subject = ?, exam_date = ?, start_time = ?, end_time = ?, location = ? WHERE id = ? AND user_id = ?",
      [subject, date, startTime, endTime, location || null, id, userId]
    );
    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    return res.json({ id, subject, date, startTime, endTime, location });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update exam" });
  }
});

app.delete("/api/exams/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await query("DELETE FROM user_exams WHERE id = ? AND user_id = ?", [id, userId]);
    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete exam" });
  }
});

// ==============================
// MARKS (MySQL; per user)
// Tables: exam_names, exam_marks
// ==============================
app.get("/api/marks", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const exams = await query("SELECT id, exam_name FROM exam_names WHERE user_id = ? ORDER BY id DESC", [userId]);
    if (!exams?.length) return res.json([]);

    const marks = await query(
      `
        SELECT em.id, em.exam_id, em.subject_name, em.obtained_marks, em.total_marks
        FROM exam_marks em
        JOIN exam_names en ON en.id = em.exam_id
        WHERE en.user_id = ?
        ORDER BY em.id ASC
      `,
      [userId]
    );

    const byExam = new Map();
    (marks || []).forEach((m) => {
      const list = byExam.get(m.exam_id) || [];
      list.push({
        id: m.id,
        name: m.subject_name || "",
        obtained: m.obtained_marks ?? "",
        total: m.total_marks ?? "",
      });
      byExam.set(m.exam_id, list);
    });

    const shaped = exams.map((e) => ({
      id: e.id,
      name: e.exam_name,
      subjects: byExam.get(e.id) || [],
    }));

    return res.json(shaped);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load marks" });
  }
});

app.post("/api/marks/exams", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const examName = String(req.body?.examName || "").trim();
    if (!examName) return res.status(400).json({ message: "Missing examName" });

    const result = await query("INSERT INTO exam_names (user_id, exam_name) VALUES (?, ?)", [userId, examName]);
    const id = result?.insertId;
    return res.json({ id, name: examName, subjects: [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create exam" });
  }
});

app.delete("/api/marks/exams/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const owned = await query("SELECT id FROM exam_names WHERE id = ? AND user_id = ?", [id, userId]);
    if (!owned?.length) return res.status(404).json({ message: "Not found" });

    await query("DELETE FROM exam_marks WHERE exam_id = ?", [id]);
    await query("DELETE FROM exam_names WHERE id = ? AND user_id = ?", [id, userId]);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete exam" });
  }
});

app.post("/api/marks/exams/:id/subjects", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const examId = Number(req.params.id);
    if (!Number.isFinite(examId)) return res.status(400).json({ message: "Invalid exam id" });

    const owned = await query("SELECT id FROM exam_names WHERE id = ? AND user_id = ?", [examId, userId]);
    if (!owned?.length) return res.status(404).json({ message: "Not found" });

    const subjectName = String(req.body?.subjectName || "").trim();
    const obtainedMarks = req.body?.obtainedMarks ?? "";
    const totalMarks = req.body?.totalMarks ?? "";
    if (!subjectName) return res.status(400).json({ message: "Missing subjectName" });

    const result = await query(
      "INSERT INTO exam_marks (exam_id, subject_name, obtained_marks, total_marks) VALUES (?, ?, ?, ?)",
      [examId, subjectName, obtainedMarks === "" ? null : Number(obtainedMarks), totalMarks === "" ? null : Number(totalMarks)]
    );
    const id = result?.insertId;
    return res.json({ id, name: subjectName, obtained: obtainedMarks, total: totalMarks });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to add subject" });
  }
});

app.put("/api/marks/subjects/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const owned = await query(
      `
        SELECT em.id
        FROM exam_marks em
        JOIN exam_names en ON en.id = em.exam_id
        WHERE em.id = ? AND en.user_id = ?
      `,
      [id, userId]
    );
    if (!owned?.length) return res.status(404).json({ message: "Not found" });

    const subjectName = String(req.body?.subjectName || "").trim();
    const obtainedMarks = req.body?.obtainedMarks ?? "";
    const totalMarks = req.body?.totalMarks ?? "";

    await query("UPDATE exam_marks SET subject_name = ?, obtained_marks = ?, total_marks = ? WHERE id = ?", [
      subjectName,
      obtainedMarks === "" ? null : Number(obtainedMarks),
      totalMarks === "" ? null : Number(totalMarks),
      id,
    ]);

    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update subject" });
  }
});

app.delete("/api/marks/subjects/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const owned = await query(
      `
        SELECT em.id
        FROM exam_marks em
        JOIN exam_names en ON en.id = em.exam_id
        WHERE em.id = ? AND en.user_id = ?
      `,
      [id, userId]
    );
    if (!owned?.length) return res.status(404).json({ message: "Not found" });

    await query("DELETE FROM exam_marks WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete subject" });
  }
});

// ==============================
// STUDY (MySQL; per user)
// Tables: study_subjects, study_units
// ==============================
app.get("/api/study", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const subjects = await query("SELECT id, name FROM study_subjects WHERE user_id = ? ORDER BY id ASC", [userId]);
    if (!subjects?.length) return res.json([]);

    const units = await query(
      `
        SELECT su.id, su.subject_id, su.unit_text, su.notes, su.learn
        FROM study_units su
        JOIN study_subjects ss ON ss.id = su.subject_id
        WHERE ss.user_id = ?
        ORDER BY su.id ASC
      `,
      [userId]
    );

    const bySubject = new Map();
    (units || []).forEach((u) => {
      const list = bySubject.get(u.subject_id) || [];
      list.push({ id: u.id, text: u.unit_text, notes: !!u.notes, learn: !!u.learn });
      bySubject.set(u.subject_id, list);
    });

    const shaped = subjects.map((s) => ({ id: s.id, name: s.name, units: bySubject.get(s.id) || [] }));
    return res.json(shaped);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load study data" });
  }
});

app.post("/api/study/subjects", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Missing name" });

    const result = await query("INSERT INTO study_subjects (user_id, name) VALUES (?, ?)", [userId, name]);
    const id = result?.insertId;
    return res.json({ id, name, units: [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create subject" });
  }
});

app.delete("/api/study/subjects/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const owned = await query("SELECT id FROM study_subjects WHERE id = ? AND user_id = ?", [id, userId]);
    if (!owned?.length) return res.status(404).json({ message: "Not found" });

    await query("DELETE FROM study_units WHERE subject_id = ?", [id]);
    await query("DELETE FROM study_subjects WHERE id = ? AND user_id = ?", [id, userId]);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete subject" });
  }
});

app.post("/api/study/units", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const subjectId = Number(req.body?.subjectId);
    const unitText = String(req.body?.unitText || "").trim();
    if (!Number.isFinite(subjectId)) return res.status(400).json({ message: "Invalid subjectId" });
    if (!unitText) return res.status(400).json({ message: "Missing unitText" });

    const owned = await query("SELECT id FROM study_subjects WHERE id = ? AND user_id = ?", [subjectId, userId]);
    if (!owned?.length) return res.status(404).json({ message: "Not found" });

    const result = await query(
      "INSERT INTO study_units (subject_id, unit_text, notes, learn) VALUES (?, ?, 0, 0)",
      [subjectId, unitText]
    );
    const id = result?.insertId;
    return res.json({ id, subjectId, text: unitText, notes: false, learn: false });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create unit" });
  }
});

app.put("/api/study/units/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const owned = await query(
      `
        SELECT su.id
        FROM study_units su
        JOIN study_subjects ss ON ss.id = su.subject_id
        WHERE su.id = ? AND ss.user_id = ?
      `,
      [id, userId]
    );
    if (!owned?.length) return res.status(404).json({ message: "Not found" });

    const unitText = req.body?.unitText !== undefined ? String(req.body.unitText).trim() : undefined;
    const notes = req.body?.notes !== undefined ? (req.body.notes ? 1 : 0) : undefined;
    const learn = req.body?.learn !== undefined ? (req.body.learn ? 1 : 0) : undefined;

    if (unitText !== undefined) {
      await query("UPDATE study_units SET unit_text = ? WHERE id = ?", [unitText, id]);
    }
    if (notes !== undefined) {
      await query("UPDATE study_units SET notes = ? WHERE id = ?", [notes, id]);
    }
    if (learn !== undefined) {
      await query("UPDATE study_units SET learn = ? WHERE id = ?", [learn, id]);
    }

    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update unit" });
  }
});

app.delete("/api/study/units/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const owned = await query(
      `
        SELECT su.id
        FROM study_units su
        JOIN study_subjects ss ON ss.id = su.subject_id
        WHERE su.id = ? AND ss.user_id = ?
      `,
      [id, userId]
    );
    if (!owned?.length) return res.status(404).json({ message: "Not found" });

    await query("DELETE FROM study_units WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete unit" });
  }
});

// ==============================
// CALENDAR (MySQL; per user)
// Table: user_calendar
// ==============================
app.get("/api/calendar", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const rows = await query(
      "SELECT id, event_date, event_text, event_color FROM user_calendar WHERE user_id = ? ORDER BY id DESC",
      [userId]
    );
    return res.json(rows || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load calendar" });
  }
});

app.post("/api/calendar", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const eventDate = String(req.body?.eventDate || "").trim();
    const eventText = String(req.body?.eventText || "").trim();
    const eventColor = String(req.body?.eventColor || "").trim();
    if (!eventDate || !eventText) return res.status(400).json({ message: "Missing eventDate/eventText" });

    const result = await query(
      "INSERT INTO user_calendar (user_id, event_date, event_text, event_color) VALUES (?, ?, ?, ?)",
      [userId, eventDate, eventText, eventColor || null]
    );
    const id = result?.insertId;
    return res.json({ id, event_date: eventDate, event_text: eventText, event_color: eventColor || null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create event" });
  }
});

app.delete("/api/calendar/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await query("DELETE FROM user_calendar WHERE id = ? AND user_id = ?", [id, userId]);
    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete event" });
  }
});

// ==============================
// COUNTDOWNS (MySQL; per user)
// Table: user_countdowns
// ==============================
app.get("/api/countdowns", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const rows = await query(
      "SELECT id, title, DATE_FORMAT(target_date, \"%Y-%m-%d\") AS target_date FROM user_countdowns WHERE user_id = ? ORDER BY target_date ASC, id DESC",
      [userId]
    );
    const mapped = (rows || []).map((r) => ({ id: r.id, title: r.title, targetDate: r.target_date }));
    return res.json(mapped);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load countdowns" });
  }
});

app.post("/api/countdowns", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const title = String(req.body?.title || "").trim();
    const targetDate = String(req.body?.targetDate || "").trim();
    if (!title || !targetDate) return res.status(400).json({ message: "Missing title/targetDate" });

    const result = await query(
      "INSERT INTO user_countdowns (user_id, title, target_date) VALUES (?, ?, ?)",
      [userId, title, `${targetDate} 00:00:00`]
    );
    const id = result?.insertId;
    return res.json({ id, title, targetDate });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create countdown" });
  }
});

app.put("/api/countdowns/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const title = String(req.body?.title || "").trim();
    const targetDate = String(req.body?.targetDate || "").trim();
    if (!title || !targetDate) return res.status(400).json({ message: "Missing title/targetDate" });

    const result = await query(
      "UPDATE user_countdowns SET title = ?, target_date = ? WHERE id = ? AND user_id = ?",
      [title, `${targetDate} 00:00:00`, id, userId]
    );
    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    return res.json({ id, title, targetDate });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update countdown" });
  }
});

app.delete("/api/countdowns/:id", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await query("DELETE FROM user_countdowns WHERE id = ? AND user_id = ?", [id, userId]);
    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete countdown" });
  }
});

// ==============================
// YEARLY ACTIVITY (MySQL; per user)
// Table: yearly_activity
// ==============================
app.get("/api/year-activity", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const year = Number(req.query?.year || new Date().getFullYear());
    const rows = await query(
      "SELECT day_of_year FROM yearly_activity WHERE user_id = ? AND year = ?",
      [userId, year]
    );
    return res.json((rows || []).map((r) => r.day_of_year));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load activity" });
  }
});

app.post("/api/year-activity/toggle", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const year = Number(req.body?.year || new Date().getFullYear());
    const dayOfYear = Number(req.body?.dayOfYear);
    if (!Number.isFinite(dayOfYear)) return res.status(400).json({ message: "Invalid dayOfYear" });

    const existing = await query(
      "SELECT id FROM yearly_activity WHERE user_id = ? AND year = ? AND day_of_year = ? LIMIT 1",
      [userId, year, dayOfYear]
    );

    if (existing?.length) {
      await query("DELETE FROM yearly_activity WHERE id = ? AND user_id = ?", [existing[0].id, userId]);
      return res.json({ highlighted: false });
    }

    await query("INSERT INTO yearly_activity (user_id, day_of_year, year) VALUES (?, ?, ?)", [
      userId,
      dayOfYear,
      year,
    ]);

    return res.json({ highlighted: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to toggle activity" });
  }
});

// ==============================
// PRODUCTION: Serve React build
// ==============================
if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
  const buildPath = path.join(__dirname, "..", "build");
  app.use(express.static(buildPath));

  // Express v5 does not accept "*" for catch-all, so use a regex.
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
