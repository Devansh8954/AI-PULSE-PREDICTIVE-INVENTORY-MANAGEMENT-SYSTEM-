<div align="center">

# ⚡ AI-Pulse
### Predictive Inventory Management System

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Angular](https://img.shields.io/badge/Angular-17.x-DD0031?logo=angular&logoColor=white)](https://angular.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](.github/workflows)

> An enterprise-grade, AI-driven inventory platform that predicts stockouts before they happen — combining real-time Google Gemini trend analysis with historical sales velocity and vendor lead-time data.

</div>

---

## Why I Built This

Most inventory systems are reactive — they alert you *after* stock runs out. AI-Pulse flips that model. It watches external demand signals (search trends, seasonal keywords, market buzz), correlates them with live stock levels, and raises alerts *before* a product goes critical. The result is fewer stockouts, less overstock, and a procurement team that stays one step ahead.

---

## What It Does

| Capability | How It Works |
|---|---|
| **Trend Signal Ingestion** | POST a keyword like *"Winter coming"* → Gemini AI returns 3–8 products predicted to spike → signals are written to the DB |
| **Demand Forecasting** | Per-SKU forecast endpoint weighs active trend signals × signal weight × stock levels to produce a 30-day demand prediction |
| **Automated PO Drafting** | Manager creates purchase orders when alerts fire; Warehouse confirms dispatch → receipt |
| **Optimistic Locking** | Every stock adjustment increments a `version` field; stale writes get HTTP 409 instead of silently corrupting data |
| **Role-Based Dashboards** | Admin, Manager, Analyst, and Warehouse each see only what they need — enforced by JWT + Angular route guards |
| **Full Audit Trail** | Every inventory state change is logged immutably in the `inventory_audit_log` table |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                      │
│            Angular 17 SPA (4 role dashboards)       │
│  Admin | Manager | Analyst Studio | Warehouse Ops   │
└─────────────────────┬───────────────────────────────┘
                      │  REST / JSON  (JWT in header)
                      ▼
┌─────────────────────────────────────────────────────┐
│               API GATEWAY LAYER                     │
│   Express.js · Helmet · Rate Limiter · CORS · JWT   │
└─────────────────────┬───────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Controller  Controller  Controller  ...
          │           │           │
          ▼           ▼           ▼
       Service     Service     Service
          │
    ┌─────┴─────┐
    ▼           ▼
Repository  Google Gemini AI
    │
    ▼
MySQL 8.x (Connection Pool via Sequelize)
```

The backend follows a strict **Controller → Service → Repository** layered pattern. No SQL leaks into controllers; no HTTP concepts leak into services.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Angular 17 + TypeScript | Reactive SPA, RxJS streams, Material UI |
| **Backend** | Node.js 18 + Express.js | REST API server |
| **Database** | MySQL 8.x + Sequelize ORM | Relational persistence with migrations |
| **AI** | Google Gemini 1.5 Flash | Demand trend keyword analysis |
| **Auth** | JWT + bcryptjs | Stateless token-based authentication |
| **Validation** | Joi | Request body schema enforcement |
| **Logging** | Winston | Structured JSON logs (dev + prod) |
| **Testing** | Jest + Supertest | Unit and integration test suite |
| **CI/CD** | GitHub Actions | Automated lint + test on every push |

---

## Project Structure

```
AI-PULSE-PREDICTIVE-INVENTORY-MANAGEMENT-SYSTEM-/
│
├── backend/
│   ├── src/
│   │   ├── app.js                  ← Express app setup (middleware registration)
│   │   ├── server.js               ← HTTP server entry point
│   │   ├── config/                 ← DB config, JWT config
│   │   ├── controllers/            ← Route handlers (parse req → call service → respond)
│   │   ├── services/               ← Business logic (TrendAnalysisService, etc.)
│   │   ├── repositories/           ← Raw SQL / Sequelize queries
│   │   ├── models/                 ← Sequelize model definitions + AppError classes
│   │   ├── middlewares/            ← Auth, rate limiter, error handler, validation
│   │   ├── routes/                 ← Express router definitions
│   │   ├── utils/                  ← Logger (Winston), helpers
│   │   └── scripts/                ← One-off DB seed and token generation scripts
│   ├── tests/                      ← Jest test suites
│   ├── .env.example                ← Template — copy to .env and fill in 2 values
│   └── package.json
│
├── frontend/
│   └── src/app/
│       ├── core/
│       │   ├── guards/             ← AuthGuard, RoleGuard
│       │   ├── interceptors/       ← JWT injection on every outbound request
│       │   └── services/           ← AuthService, InventoryService, ForecastService, …
│       ├── features/
│       │   ├── login/              ← Login page
│       │   ├── dashboard/          ← Admin Command Center
│       │   ├── manager-dashboard/  ← Purchase order management
│       │   ├── analyst-dashboard/  ← Demand forecast charts + CSV export
│       │   └── warehouse-dashboard/← Bin locations + PO dispatch/receive
│       └── shared/
│           ├── components/         ← Shell layout, Sidebar
│           └── styles/             ← dashboard-shared.scss (imported by all dashboards)
│
├── database/
│   ├── schema.sql                  ← All CREATE TABLE statements
│   └── seed.sql                    ← Sample products, vendors, inventory records
│
├── SETUP.md                        ← Step-by-step local setup guide
└── README.md                       ← This file
```

---

## Getting Started

Full setup instructions (including screenshots of expected output) are in **[SETUP.md](SETUP.md)**.

The short version:

```bash
# 1. Create the database
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql

# 2. Start the backend
cd backend
cp .env.example .env   # then set DB_PASSWORD and optionally GEMINI_API_KEY
npm install
npm run dev            # → http://localhost:3000

# 3. Start the frontend (new terminal)
cd frontend
npm install
ng serve               # → http://localhost:4200
```

> **Note:** The Angular dev proxy (`proxy.conf.json`) automatically forwards `/api` requests to port 3000. You don't need to configure CORS manually.

---

## Dashboards

| URL | Role | What You Can Do |
|---|---|---|
| `/dashboard` | **Admin** | Trigger AI trend analysis, view live signal table, filter by signal type, export CSV |
| `/manager` | **Manager** | Review stock alerts, create/approve/cancel Purchase Orders |
| `/analyst` | **Analyst Studio** | View 30-day demand forecast charts, filter by alert level, export filtered SKUs to CSV |
| `/warehouse` | **Warehouse Ops** | View bin inventory, mark POs as Dispatched → Received |

---

## API Reference

All endpoints are prefixed with `/api/v1`. Most require a `Bearer` JWT token in the `Authorization` header.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Create a new user account |
| `POST` | `/auth/login` | None | Login and receive a JWT token |
| `GET` | `/auth/me` | Any role | Return the currently authenticated user |

### Products

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/products` | Any | List all active products (supports `?limit=` and `?category=`) |
| `POST` | `/products` | ADMIN | Create a new product |
| `GET` | `/products/:id` | Any | Get a single product by ID |
| `PUT` | `/products/:id` | ADMIN | Update a product (requires `version` for optimistic locking) |
| `DELETE` | `/products/:id` | ADMIN | Soft-delete a product |

### Inventory

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/inventory` | Any | List all inventory records with product + vendor details |
| `GET` | `/inventory/:id` | Any | Get one inventory record (includes `version` for OCC) |
| `PATCH` | `/inventory/:id/adjust` | ADMIN / MANAGER | Adjust stock quantity (optimistic concurrency control) |

**Example — OCC stock adjustment:**
```json
PATCH /api/v1/inventory/inv00001-0000-0000-0000-000000000001/adjust
Authorization: Bearer <token>

{
  "delta":   -5,
  "version":  0,
  "reason":  "Sale order #SO-2024-001"
}
```
If another request updated the record first, the server responds `409 Conflict` — you must re-fetch and retry.

### Vendors

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/vendors` | Any | List all vendors with reliability scores |
| `POST` | `/vendors` | ADMIN | Register a new vendor |

### Trend Signals

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/signals` | Any | List all trend signals (with product info joined) |
| `POST` | `/signals/ingest` | ADMIN | Manually ingest a custom trend signal |

### Trend Analysis (AI)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/trends/analyze` | ADMIN / MANAGER | Run Gemini AI keyword analysis and write signals |
| `GET` | `/trends/signals` | Any | Fetch the signals table (same as `/signals`) |

**Example — AI trend analysis:**
```json
POST /api/v1/trends/analyze
Authorization: Bearer <token>

{ "keyword": "Winter coming" }
```

### Forecasting

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/forecast/:productId` | Any | Get the weighted 30-day demand forecast for a SKU |

---

## Key Design Decisions

### Optimistic Concurrency Control (OCC)

Concurrent warehouse updates on the same SKU can corrupt stock counts without proper locking. AI-Pulse uses version-based OCC:

```sql
-- The inventory record carries a `version` integer.
-- Every successful update increments it by 1.
UPDATE inventory
SET quantity_on_hand = quantity_on_hand + ?,
    version          = version + 1
WHERE id = ? AND version = ?;
-- If affected rows = 0, the record changed since you read it → HTTP 409
```

This avoids pessimistic row-locking while still guaranteeing correctness under concurrency.

### Controller → Service → Repository

HTTP concerns stay in controllers. Business rules stay in services. SQL stays in repositories. This strict separation makes each layer independently testable:

```
HTTP Request
  → Controller   (parse & validate req, map to service call, format HTTP response)
  → Service      (business logic, domain errors, cross-entity orchestration)
  → Repository   (raw Sequelize / SQL queries, returns plain objects)
  → MySQL
```

### AI Signal Pipeline

```
POST /trends/analyze { keyword }
         │
         ▼
  callGeminiAI(keyword)
  → Returns: [{ sku, productName, trendScore, reason }, ...]
         │
         ▼
  crossReferenceInventory()
  → Joins AI predictions with live DB stock levels
  → Classifies each as LOW_STOCK / ADEQUATE / NOT_IN_CATALOG
         │
         ▼
  persistTrendSignals()
  → Upserts a trend_signals row for each LOW_STOCK + trending product
  → Keyed on (product_id, signal_source, signal_date) to prevent duplicates
         │
         ▼
  Returns structured AnalysisReport to caller
```

---

## Running Tests

```bash
cd backend
npm test                  # run all tests
npm run test:coverage     # with coverage report (target: 60% lines/functions)
```

---

## Environment Variables

See `backend/.env.example` for the full list. The only two you must set are:

| Variable | Required | Description |
|---|---|---|
| `DB_PASSWORD` | ✅ Yes | Your MySQL root (or app user) password |
| `GEMINI_API_KEY` | Optional | Free key from [aistudio.google.com](https://aistudio.google.com/app/apikey). Only needed for AI trend analysis. All dashboards work without it. |

---

<div align="center">

Built as a **Senior SDE-1 portfolio project** to demonstrate full-stack architecture, AI integration, and production-grade engineering patterns.

</div>
