# AI-Pulse — Local Setup Guide

This guide gets you from a fresh clone to a fully running system in about 10 minutes. You'll need three terminal windows by the end.

---

## Prerequisites

| Tool | Minimum Version | Check With |
|---|---|---|
| Node.js | 18.x | `node -v` |
| npm | 9.x | `npm -v` |
| MySQL | 8.x | `mysql --version` |
| Angular CLI | 17.x | `ng version` |

**Install Angular CLI if missing:**
```bash
npm install -g @angular/cli@17
```

---

## Step 1 — Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set **two values** — everything else has safe defaults:

```env
DB_PASSWORD=your_mysql_root_password

# Optional — only needed for the "Analyze with AI" button in the Admin dashboard.
# Free key: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key
```

---

## Step 2 — Set Up the Database

Run these two SQL files **in order** — schema first, then seed data:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

Or open MySQL Workbench and run them through the GUI:
1. `database/schema.sql` — creates the database and all tables
2. `database/seed.sql` — inserts sample products, vendors, and inventory records

---

## Step 3 — Start the Backend API

```bash
cd backend
npm install
npm run dev
```

You should see:
```
✅  MySQL connection established.
🚀  AI-Pulse API running → http://localhost:3000
📘  Environment → development
```

**Quick health check:**
```
GET http://localhost:3000/health
→ { "status": "OK", "timestamp": "..." }
```

---

## Step 4 — Generate a Test JWT Token

The app has a full login UI, but you can also generate tokens from the command line for Postman/Insomnia testing:

```bash
cd backend
node src/scripts/generate-token.js ADMIN
```

Available roles: `ADMIN` · `MANAGER` · `ANALYST` · `WAREHOUSE`

Use the printed token as a Bearer header:
```
Authorization: Bearer <paste-token-here>
```

---

## Step 5 — Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install
ng serve
```

You should see:
```
✔ Compiled successfully.
→ Local: http://localhost:4200
```

> The Angular proxy config (`proxy.conf.json`) automatically forwards all `/api/*` requests to `localhost:3000`. No manual CORS configuration needed.

---

## Step 6 — Explore the Dashboards

Open `http://localhost:4200` and log in. The four role dashboards are:

| URL | Role | What's Here |
|---|---|---|
| `/dashboard` | **Admin** | AI trend keyword analysis, live signal table, signal-type filter pills, CSV export, stock vs. demand chart |
| `/manager` | **Manager** | Stock alert table, create/approve/cancel Purchase Orders, PO workflow visualizer |
| `/analyst` | **Analyst Studio** | 30-day demand forecast charts (bar + doughnut), alert-level filter pills, CSV export |
| `/warehouse` | **Warehouse Ops** | Bin location inventory, mark POs as Dispatched → Received, capacity bars |

### Responsive Layout

- **Desktop (≥ 1025px)** — Full sidebar. Click `<` to collapse to icon-only mode.
- **Tablet (601–1024px)** — Sidebar auto-collapses to icon-only. Hover icons for tooltips.
- **Mobile (≤ 600px)** — Sidebar hidden. Use the bottom navigation bar.

---

## Step 7 — Test Key API Endpoints

All endpoints require a Bearer token except `/health`.

| Method | URL | Role Needed | What It Does |
|---|---|---|---|
| GET | `/health` | None | Health check — no auth |
| GET | `/api/v1/products` | Any | List all products |
| GET | `/api/v1/inventory` | Any | List inventory with product + vendor details |
| GET | `/api/v1/inventory/:id` | Any | Get one record (includes `version` for OCC) |
| PATCH | `/api/v1/inventory/:id/adjust` | ADMIN / MANAGER | Adjust stock (optimistic concurrency control) |
| GET | `/api/v1/forecast/:productId` | Any | 30-day demand forecast for one SKU |
| POST | `/api/v1/trends/analyze` | ADMIN / MANAGER | Run Gemini AI keyword analysis |
| GET | `/api/v1/trends/signals` | Any | List all trend signals |

### Example: OCC Stock Adjustment

```json
PATCH /api/v1/inventory/inv00001-0000-0000-0000-000000000001/adjust

{
  "delta":   -5,
  "version":  0,
  "reason":  "Sale order #SO-2024-001"
}
```

If another user updated the record concurrently, you'll get `409 Conflict`. Re-fetch and retry.

### Example: AI Trend Analysis

```json
POST /api/v1/trends/analyze

{ "keyword": "Winter coming" }
```

Gemini will return 3–8 products predicted to spike. Those that match catalog items with low stock will get trend signals written automatically.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `ER_ACCESS_DENIED` | Wrong DB password | Update `DB_PASSWORD` in `backend/.env` |
| `ER_BAD_DB_ERROR` | Database not created | Run `database/schema.sql` first |
| `Cannot find module '../config/jwt.config'` | `.env` not loaded | Make sure `.env` is inside `backend/` (not the root) |
| `GEMINI_API_KEY is not configured` | No API key | Add to `.env`, or skip — all dashboards work without it |
| `ng: command not found` | Angular CLI missing | Run `npm install -g @angular/cli@17` |
| Port 3000 already in use | Another process | Change `PORT=3001` in `backend/.env` |
| Port 4200 already in use | Another `ng serve` | Run `ng serve --port 4201` |
| Sidebar icons not showing | Material Icons CDN blocked | Icons load from Google Fonts — check your network/firewall |
