const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

// Lightweight .env loader matching server.js logic
function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.log("No .env file found at " + envPath);
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

loadEnvFile();

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  last_login DATE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INT NOT NULL PRIMARY KEY,
  full_name VARCHAR(255) DEFAULT NULL,
  age INT DEFAULT NULL,
  birthdate DATE DEFAULT NULL,
  gender VARCHAR(20) DEFAULT NULL,
  institution_name VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_budgets (
  user_id INT NOT NULL PRIMARY KEY,
  weekly_budget DECIMAL(10,2) DEFAULT 0.00,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  payment_method VARCHAR(50) DEFAULT NULL,
  expense_date DATE NOT NULL,
  notes TEXT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entry_date VARCHAR(50) NOT NULL,
  entry_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  text VARCHAR(255) DEFAULT NULL,
  completed TINYINT(1) DEFAULT 0,
  week_number INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS timetable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  day_index INT DEFAULT NULL,
  period_index INT DEFAULT NULL,
  subject VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  exam_date VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) DEFAULT '00:00',
  end_time VARCHAR(10) DEFAULT '00:00',
  location VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exam_names (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  exam_name VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exam_marks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT DEFAULT NULL,
  subject_name VARCHAR(255) DEFAULT NULL,
  obtained_marks DECIMAL(5,2) DEFAULT NULL,
  total_marks DECIMAL(5,2) DEFAULT NULL,
  FOREIGN KEY (exam_id) REFERENCES exam_names(id)
);

CREATE TABLE IF NOT EXISTS study_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS study_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT DEFAULT NULL,
  unit_text VARCHAR(255) NOT NULL,
  notes TINYINT(1) DEFAULT 0,
  learn TINYINT(1) DEFAULT 0,
  FOREIGN KEY (subject_id) REFERENCES study_subjects(id)
);

CREATE TABLE IF NOT EXISTS user_calendar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_date VARCHAR(20) NOT NULL,
  event_text VARCHAR(255) NOT NULL,
  event_color VARCHAR(20) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_countdowns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  target_date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS yearly_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  day_of_year INT DEFAULT NULL,
  year INT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

async function init() {
  // Use environment variables (injected by Railway)
  const connectionConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  };

  // Log connection attempt
  console.log(`Connecting to database ${connectionConfig.database} on ${connectionConfig.host}...`);

  if (!connectionConfig.host || !connectionConfig.password) {
    console.error("CRITICAL ERROR: Missing Database Variables!");
    console.error("Ensure DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME are set in Railway Variables.");
    process.exit(1);
  }

  try {
    const connection = await mysql.createConnection(connectionConfig);
    console.log("Connected successfully!");

    console.log("Creating tables...");
    await connection.query(schema);
    console.log("All tables created successfully!");

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error("Error initializing database:", err.message);
    process.exit(1);
  }
}

init();
