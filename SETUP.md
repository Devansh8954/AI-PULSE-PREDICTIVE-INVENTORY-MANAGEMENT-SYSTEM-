# AI-Pulse — Complete Setup Guide

## Prerequisites

| Tool | Minimum Version | Check with |
|---|---|---|
| Node.js | 18.x | `node -v` |
| npm | 9.x | `npm -v` |
| MySQL | 8.x | `mysql --version` |
| Angular CLI | 17.x | `ng version` |

---

## Step 1 — Configure Environment

Open `backend/.env` and fill in **two values**:

```env
DB_PASSWORD=your_mysql_root_password
GEMINI_API_KEY=your_gemini_api_key   # Optional — get free at https://aistudio.google.com/app/apikey
```

---

## Step 2 — Setup MySQL Database

Open MySQL Workbench (or any MySQL client) and run these two files **in order**:

```
1. database/schema.sql    ← Creates tables
2. database/seed.sql      ← Inserts sample data
```

Or from terminal:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

---

## Step 3 — Install & Run Backend

```bash
cd backend
npm install
npm run dev
```

**Expected output:**
```
✅  MySQL connection established via Sequelize.
🚀  AI-Pulse API running → http://localhost:3000
📘  Environment → development
```

**Test it:**
```
GET http://localhost:3000/health
→ { "status": "OK", "timestamp": "..." }
```

---

## Step 4 — Generate a Dev JWT Token

Since there's no login UI yet, generate a test token:

```bash
cd backend
node src/scripts/generate-token.js ADMIN
```

Copy the printed token. Use it in Postman:
```
Header: Authorization: Bearer <paste-token-here>
```

---

## Step 5 — Install & Run Frontend

```bash
cd frontend
npm install
npm start
```

**Expected output:**
```
✔ Compiled successfully.
→ http://localhost:4200
```

> The Angular dev proxy (`proxy.conf.json`) forwards all `/api` calls to `localhost:3000` automatically — no CORS issues.

---

## Step 6 — Test Key API Endpoints

| Method | URL | Auth Role | Description |
|---|---|---|---|
| GET | `/health` | None | Health check |
| GET | `/api/v1/products` | Any | List products |
| GET | `/api/v1/inventory` | Any | List inventory |
| GET | `/api/v1/inventory/:id` | Any | Get stock + version |
| PATCH | `/api/v1/inventory/:id/adjust` | ADMIN/MANAGER | **OCC stock update** |
| GET | `/api/v1/forecast/:productId` | Any | AI demand forecast |
| POST | `/api/v1/trends/analyze` | ADMIN/MANAGER | **Trigger Gemini AI** |
| GET | `/api/v1/trends/signals` | Any | List trend signals |

### Example: OCC Stock Update
```json
PATCH /api/v1/inventory/inv00001-0000-0000-0000-000000000001/adjust
{
  "delta":   -5,
  "version": 0,
  "reason":  "Sale order #SO-001"
}
```

### Example: AI Trend Analysis
```json
POST /api/v1/trends/analyze
{
  "keyword": "Winter coming"
}
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `ER_ACCESS_DENIED` | Wrong DB password | Update `DB_PASSWORD` in `.env` |
| `ER_BAD_DB_ERROR` | Database not created | Run `schema.sql` first |
| `Cannot find module '../config/jwt.config'` | `.env` not loaded | Ensure `.env` is in `backend/` folder |
| `GEMINI_API_KEY is not configured` | No API key | Add key to `.env` or skip AI features |
| `ng: command not found` | Angular CLI not installed | Run `npm install -g @angular/cli@17` |
| Port 3000 in use | Another process | Change `PORT=3001` in `.env` |
