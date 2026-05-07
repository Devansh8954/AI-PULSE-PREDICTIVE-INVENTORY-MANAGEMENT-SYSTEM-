# AI-Pulse — Complete Setup Guide

## Prerequisites

| Tool | Minimum Version | Check with |
|---|---|---|
| Node.js | 18.x | `node -v` |
| npm | 9.x | `npm -v` |
| MySQL | 8.x | `mysql --version` |
| Angular CLI | 17.x | `ng version` |

> **Quick install Angular CLI (if missing):**
> ```bash
> npm install -g @angular/cli@17
> ```

---

## Step 1 — Configure Environment

Copy the example env file and fill in **two values**:

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set:

```env
DB_PASSWORD=your_mysql_root_password
GEMINI_API_KEY=your_gemini_api_key   # Free key → https://aistudio.google.com/app/apikey
```

> `GEMINI_API_KEY` is optional — all dashboards work without it. Only the **"Analyze with AI"** button in the Admin dashboard requires it.

---

## Step 2 — Setup MySQL Database

Open MySQL Workbench (or any MySQL client) and run these two files **in order**:

```
1. database/schema.sql    ← Creates the database and all tables
2. database/seed.sql      ← Inserts sample products, vendors, inventory
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
✅  MySQL connection established.
🚀  AI-Pulse API running → http://localhost:3000
📘  Environment → development
```

**Verify:**
```
GET http://localhost:3000/health
→ { "status": "OK", "timestamp": "..." }
```

---

## Step 4 — Generate a Dev JWT Token

Since there's no login UI, generate a test token for API testing:

```bash
cd backend
node src/scripts/generate-token.js ADMIN
```

Copy the printed token and use it in Postman / Insomnia:
```
Header: Authorization: Bearer <paste-token-here>
```

Available roles: `ADMIN`, `MANAGER`, `ANALYST`, `WAREHOUSE`

---

## Step 5 — Install & Run Frontend

```bash
cd frontend
npm install
ng serve
```

**Expected output:**
```
✔ Compiled successfully.
→ Local: http://localhost:4200
```

> The Angular proxy (`proxy.conf.json`) automatically forwards `/api` calls to `localhost:3000` — no CORS issues.

---

## Step 6 — Navigate the Dashboards

Open `http://localhost:4200` in your browser. You will see:

| URL | Dashboard | Description |
|---|---|---|
| `/dashboard`  | **Admin Command Center** | AI trend analysis, live signal table, stock vs demand chart |
| `/manager`    | **Manager View**         | Stock alerts (critical/low), purchase orders |
| `/analyst`    | **Analyst Studio**       | Demand forecast charts, 30-day SKU-level predictions |
| `/warehouse`  | **Warehouse Ops**        | Bin locations, capacity levels, audit log |

### Navigation
- **Desktop/Laptop (≥ 1025px)** — Use the full sidebar on the left. Click **`<`** to collapse to icon-only mode.
- **Tablet (601–1024px)** — Sidebar auto-collapses to icon-only. Hover icons to see tooltips.
- **Mobile (≤ 600px)** — Sidebar is hidden. Use the **bottom navigation bar** to switch dashboards.

---

## Step 7 — Test Key API Endpoints

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
| `ER_ACCESS_DENIED` | Wrong DB password | Update `DB_PASSWORD` in `backend/.env` |
| `ER_BAD_DB_ERROR` | Database not created | Run `database/schema.sql` first |
| `Cannot find module '../config/jwt.config'` | `.env` not loaded | Ensure `.env` is inside `backend/` folder |
| `GEMINI_API_KEY is not configured` | No API key set | Add key to `.env`, or skip AI features |
| `ng: command not found` | Angular CLI not installed | Run `npm install -g @angular/cli@17` |
| Port 3000 in use | Another process running | Change `PORT=3001` in `backend/.env` |
| Port 4200 in use | Another ng serve running | Run `ng serve --port 4201` |
| Sidebar icons not showing | Material Icons font blocked | Check network; icons load from Google Fonts CDN |
