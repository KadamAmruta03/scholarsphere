# Study Habit Analyzer | Academic Performance Tracker

<div align="center">

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql)
![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat-square&logo=jsonwebtokens)
![Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?style=flat-square&logo=railway)

</div>

> A full-stack web application that helps students analyze and improve their study habits through data-driven insights, session tracking, and performance visualization.


<div align="center">

  <!-- Dashboard -->
  <img width="850" alt="Dashboard" src="https://github.com/user-attachments/assets/f4af780e-d37e-4bbe-80a2-f32f0234fa7d" />
  <p><i>Dashboard — Study session overview and habit streaks</i></p>

  <br/>

  <!-- Calendar -->
  <img width="850" alt="Calendar" src="https://github.com/user-attachments/assets/39d5d598-79b9-472a-b1b0-3c8870fadbad" />
  <p><i>Calendar — Visual tracking of daily study activity</i></p>

  <br/>

  <!-- Marks Analytics -->
  <img width="850" alt="Marks Analytics" src="https://github.com/user-attachments/assets/0f1fd882-0d27-430d-852f-978ebf91e416" />
  <p><i>Marks Analytics — Performance trends and subject insights</i></p>

  <br/>

  <!-- Profile -->
  <img width="850" alt="Profile" src="https://github.com/user-attachments/assets/e1903a21-25de-4df1-a561-e02cae0eae6e" />
  <p><i>Profile — User information, stats, and personalization</i></p>

</div>

**🔗 Live Demo:** [your-live-url.up.railway.app](https://scholarsphere-pied.vercel.app)

---

## Overview

Students often struggle to understand *how* they study, not just *what* they study. Study Habit Analyzer solves this by letting students log study sessions, tag subjects, and visualize their patterns over time — revealing weak spots, productive hours, and habit consistency.

Built as a full-stack project using React, Node/Express, and MySQL to demonstrate relational data modeling, JWT authentication, and unified frontend/backend deployment on Railway with a managed MySQL service.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Create React App), React Router DOM, Axios |
| Backend | Node.js, Express.js |
| Database | MySQL 8.0 — Railway MySQL Service |
| Authentication | JSON Web Tokens (JWT) |
| Deployment | Railway (Backend + MySQL hosted together) |

---

## Key Features

- **JWT Authentication** — Secure login with token-based session persistence
- **Study Session Logging** — Track sessions by subject, duration, and date
- **Performance Analytics** — Visualize study trends, streaks, and time distribution
- **Unified Deployment** — Backend serves React `build/` in production via `NODE_ENV=production`
- **Health Check Endpoint** — `GET /api/status` returns `{ ok, db }` to verify server and DB are alive
- **Relational Schema** — MySQL tables linking users, sessions, and subjects with foreign key constraints

---

## Project Structure

```text
study-habit-analyzer/
├── src/                         <-- React Frontend (Create React App)
│   ├── components/              <-- Reusable UI components
│   ├── pages/                   <-- Dashboard, Analytics, Login, Profile
│   ├── context/                 <-- Auth & global state
│   └── App.js                   <-- Root router
├── server/
│   └── server.js                <-- Express API + serves React build in prod
├── .env.example                 <-- Frontend env template
├── server/.env.example          <-- Backend env template
└── README.md
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0 (local instance or Railway MySQL service)

### Steps

```bash
git clone https://github.com/KadamAmruta03/scholarsphere.git
cd study-habit-analyzer
```

**Configure environment files:**

```bash
# Frontend (optional — defaults to http://localhost:5000)
cp .env.example .env

# Backend (required)
cp server/.env.example server/.env
# Open server/.env and fill in all DB_* and JWT_SECRET values
```

**Install & run:**

```bash
# Install all dependencies
npm install

# Run backend (port 5000)
npm run server

# Run frontend (port 3000)
npm start
```

Open frontend: `http://localhost:3000`
API running at: `http://localhost:5000`

---

## Environment Variables

### Backend — `server/.env`

| Variable | Description | Example |
|---|---|---|
| `DB_HOST` | Railway MySQL host | `containers-us-west-XX.railway.app` |
| `DB_PORT` | Railway MySQL port | `6543` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASS` | MySQL password | `your_password` |
| `DB_NAME` | Database name | `study_analyzer` |
| `JWT_SECRET` | Secret for token signing | `your_secret_key` |
| `NODE_ENV` | Environment mode | `development` |

### Frontend — `.env`

| Variable | Description | Default |
|---|---|---|
| `REACT_APP_API_BASE_URL` | Backend URL | `http://localhost:5000` |

> In production on Railway, `REACT_APP_API_BASE_URL` should point to your Railway backend service URL.

---

## Cloud Deployment (Railway)

This project uses **Railway** for both the Node.js backend and the MySQL database — hosted as two linked services in the same Railway project.

| Service | Purpose | Config |
|---|---|---|
| **Railway — Node Service** | Hosts Express backend + serves React build | Add all `server/.env` variables in Railway Variables tab |
| **Railway — MySQL Service** | Managed MySQL 8.0 database | Auto-injects `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` |

### Deployment Steps

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub Repo**
3. Add a **MySQL** plugin inside the same Railway project
4. Railway auto-injects MySQL environment variables into your Node service
5. Set `NODE_ENV=production` and `REACT_APP_API_BASE_URL` in the Railway Variables tab
6. Railway auto-builds and deploys on every push to `main`

> In production, `server.js` automatically serves the React `build/` folder when `NODE_ENV=production` — no separate frontend hosting needed.

---

## API Health Check

```bash
GET /api/status

# Response:
# { "ok": true, "db": true }
```

Use this endpoint after deployment to confirm both the Express server and MySQL connection are live.

---

## What I Built This To Demonstrate

- **Relational data modeling** — MySQL schema linking users, sessions, and subjects with foreign key constraints
- **Unified full-stack deployment** — single Railway project hosting both Node API and MySQL service
- **JWT auth flow** — token generation, Express middleware verification, and protected routes
- **Production-ready server** — Node.js serves React static build automatically in production mode

---

## Contributing

Found a bug or want to suggest a feature? Open an issue or fork the repo and submit a pull request. All contributions are welcome.

---

## License

This project is open-source. Contributions are welcome.
