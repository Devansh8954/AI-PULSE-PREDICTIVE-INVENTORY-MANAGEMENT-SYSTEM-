# AI-Pulse — Complete Codebase Guide
## PART 1: Project Overview + Backend

---

## 1. What Is AI-Pulse?

AI-Pulse is a **Predictive Inventory Management System**. It solves a real business problem:
- Traditional inventory systems react *after* stock runs out.
- AI-Pulse predicts *before* — using Google Gemini AI to analyze trend keywords and cross-reference live stock levels.

**Result:** Fewer stockouts, less overstock, smarter procurement.

---

## 2. Tech Stack (Why Each Was Chosen)

| Layer | Technology | Why |
|---|---|---|
| Frontend | Angular 17 + TypeScript | Reactive, component-based SPA; strong typing prevents runtime bugs |
| Backend | Node.js 18 + Express.js | Fast, non-blocking I/O; great for REST APIs |
| Database | MySQL 8.x | Relational — products, inventory, vendors have structured relationships |
| ORM | Sequelize 6 | Maps JS objects to SQL tables; also allows raw SQL when needed |
| AI | Google Gemini 1.5 Flash | Free, fast LLM for demand trend analysis |
| Auth | JWT + bcryptjs | Stateless tokens — no server sessions needed |
| Validation | Joi | Declarative schema validation for request bodies |
| Logging | Winston | Structured JSON logs; different levels for dev vs prod |
| Testing | Jest + Supertest | Unit + integration tests for backend services and routes |
| CI/CD | GitHub Actions | Automated lint + test on every push |

---

## 3. Overall System Architecture

```
Browser (Angular SPA)
    │
    │  HTTPS + JSON
    │  Authorization: Bearer <JWT>
    ▼
Express.js API (port 3000)
    │
    ├── Helmet         → Sets security HTTP headers
    ├── CORS           → Only allows requests from localhost:4200
    ├── Morgan         → Logs every request in dev mode
    ├── Rate Limiter   → Max 100 req/IP/15min in production
    │
    ├── /api/v1/auth           → Login, Register, Me
    ├── /api/v1/products       → Product CRUD
    ├── /api/v1/inventory      → Stock levels + OCC adjustment
    ├── /api/v1/vendors        → Vendor list
    ├── /api/v1/signals        → Raw trend signals
    ├── /api/v1/trends         → Gemini AI analysis
    ├── /api/v1/forecast       → 30-day demand forecasts
    └── /api/v1/purchase-orders → PO lifecycle
    │
    ▼
MySQL 8.x (Connection Pool via Sequelize)
```

---

## 4. Backend Folder Structure

```
backend/src/
├── server.js          ← Boots the HTTP server on port 3000
├── app.js             ← Creates Express app, registers all middleware
├── config/
│   ├── db.config.js   ← Sequelize connection pool setup
│   └── jwt.config.js  ← JWT secret + expiry from .env
├── controllers/       ← LAYER 1: HTTP parse → call service → respond
├── services/          ← LAYER 2: Business logic only
├── repositories/      ← LAYER 3: All SQL/Sequelize queries
├── models/            ← Sequelize model definitions + AppError classes
├── middlewares/       ← auth, errorHandler, rateLimiter, validate
├── routes/            ← Express Router definitions (which URL → which controller)
├── utils/             ← logger (Winston), auth.helpers.js
└── scripts/           ← One-off DB seed scripts, token generator
```

---

## 5. The 3-Layer Backend Pattern

Every feature follows **Controller → Service → Repository**.

```
HTTP Request
  │
  ▼ CONTROLLER  (inventory.controller.js)
    • Reads req.params, req.body, req.query
    • Calls the service
    • Returns res.status(200).json(...)
    • NEVER contains SQL or business logic
  │
  ▼ SERVICE  (inventory.service.js)
    • Contains ALL business rules
    • Decides: "is this valid? does this conflict?"
    • Throws AppError if something is wrong
    • NEVER knows about req/res/HTTP status codes
  │
  ▼ REPOSITORY  (inventory.repository.js)
    • Contains ALL SQL / Sequelize queries
    • Returns plain data objects
    • NEVER contains business rules
  │
  ▼ MySQL Database
```

**Why this matters:** Each layer is independently testable. You can unit-test a service without HTTP. You can swap MySQL for PostgreSQL by only changing the repository layer.

---

## 6. Key Backend Files Explained

### `server.js`
- Entry point. Calls `app.listen(PORT)`.
- Prints startup confirmation to console.
- Handles uncaught exceptions and unhandled promise rejections.

### `app.js`
- Creates the Express app object.
- Registers middleware in order: Helmet → CORS → JSON parser → Morgan → Rate Limiter → Routes → 404 handler → Error handler.
- **Order matters:** Error handler MUST be last.

### `config/db.config.js`
- Creates a Sequelize instance with connection pooling.
- Pool settings: min 2 connections, max 10, 30s idle timeout.
- Tests the connection on startup — crashes with a clear error if MySQL is unreachable.

### `config/jwt.config.js`
- Exports `{ secret, expiresIn }` read from `.env`.
- `secret` = random string, never hardcoded.
- `expiresIn` = default `'24h'`.

---

## 7. Middleware — Every Request Passes Through These

### `auth.middleware.js` — JWT Verification

```
Every protected route calls: auth(['ADMIN', 'MANAGER'])

Step 1: Extract Bearer token from Authorization header
Step 2: jwt.verify(token, secret) → decodes payload
Step 3: Check decoded.role is in allowedRoles array
Step 4: Attach decoded payload to req.user
Step 5: Call next()

If token missing → 401
If token invalid/expired → 401 (caught by errorHandler)
If role not allowed → 403
```

**Usage in routes:**
```js
router.patch('/:id/adjust', auth(['ADMIN', 'MANAGER']), adjustStock);
// Only ADMIN and MANAGER can adjust stock
```

### `errorHandler.middleware.js` — Centralized Error Handler

All errors funnel here via `next(err)`. It maps error types to HTTP responses:

| Error Type | HTTP Status | Code |
|---|---|---|
| AppError (operational) | err.statusCode | err.name |
| SequelizeValidationError | 422 | VALIDATION_ERROR |
| SequelizeUniqueConstraintError | 409 | DUPLICATE_ENTRY |
| SequelizeOptimisticLockError | 409 | OPTIMISTIC_LOCK_CONFLICT |
| JsonWebTokenError | 401 | INVALID_TOKEN |
| TokenExpiredError | 401 | TOKEN_EXPIRED |
| SyntaxError (bad JSON) | 400 | MALFORMED_JSON |
| Everything else | 500 | INTERNAL_SERVER_ERROR |

**Key rule:** Stack traces are only included in `development` mode — never exposed in production.

### `rateLimiter.middleware.js` — DDoS / Brute-Force Protection

- Uses `express-rate-limit` library.
- Window: 15 minutes. Max: 100 requests per IP.
- In development: localhost is skipped entirely (no limit).
- `GET /api/v1/products` is also excluded (high-traffic pagination calls).
- On breach → `429 Too Many Requests` with `Retry-After` header.

### `validate.middleware.js` — Joi Request Validation

- Each route can attach a Joi schema.
- Validates `req.body` before the controller runs.
- Returns `422 Unprocessable Entity` if validation fails.
- Keeps validation logic OUT of controllers.

---

## 8. Authentication Flow (Full)

```
User submits login form
    │
    ▼ POST /api/v1/auth/login  { email, password }
    │
    ▼ auth.controller.js → login()
      1. Find user by email (case-insensitive)
      2. bcrypt.compare(password, user.passwordHash)
      3. If match → signUserToken(user) → JWT signed with secret
      4. Return: { token, user: { id, name, email, role } }
    │
    ▼ Frontend stores token in localStorage
    │
    ▼ Every subsequent API call:
      AuthInterceptor adds: "Authorization: Bearer <token>"
    │
    ▼ Backend auth.middleware.js verifies token on every protected route
```

**JWT Payload contains:**
```json
{ "sub": "user-uuid", "name": "Devansh", "email": "...", "role": "ADMIN", "iat": 123, "exp": 456 }
```

**Passwords:** Hashed with bcrypt (12 salt rounds). The hash is NEVER returned in any API response.

---

## 9. Optimistic Concurrency Control (OCC) — The Key Feature

**The Problem:** Two warehouse workers read stock = 50 at the same time. Both ship 10 units. Without locking, stock becomes 40 instead of 30.

**The Solution — Version Numbers:**

Every inventory record has a `version` integer. When you read a record, you get its version. When you update, you MUST send that version back.

```sql
UPDATE inventory
SET
  quantity_on_hand = quantity_on_hand + :delta,
  version          = version + 1,
  updated_at       = NOW()
WHERE
      id      = :id
  AND version = :version                      ← OCC guard
  AND (quantity_on_hand + :delta) >= 0        ← no negative stock
```

- If `affectedRows = 1` → success. Version is now incremented.
- If `affectedRows = 0` → someone else updated first. Client gets **HTTP 409 Conflict**.
- Client must re-fetch (get new version) and retry.

**Why raw SQL instead of Sequelize ORM?**
The ORM would do: read → modify in JS → save. That is NOT atomic. Between read and save, another update could happen. Raw SQL performs the entire operation in one atomic MySQL statement.

**Audit Trail:** Every successful adjustment also writes to `inventory_audit_log` table — inside the SAME database transaction. If the audit insert fails, it's caught silently (doesn't roll back the stock update).

---

## 10. AI Trend Analysis Pipeline

This is the most complex feature. Triggered by: `POST /api/v1/trends/analyze { keyword }`.

```
Step 1 — callGeminiAI(keyword)
  Sends a structured prompt to Google Gemini 1.5 Flash:
  "Analyze 'Winter coming'. Return JSON array of products likely to spike."
  Gemini returns: [{ sku, productName, category, trendScore, reason }]
  Defensive parsing: strips markdown fences, handles malformed JSON.

Step 2 — crossReferenceInventory(aiProducts)
  Takes Gemini's SKU list.
  Runs a single JOIN query: Products + Inventory WHERE sku IN (...)
  Classifies each product as:
    • LOW_STOCK   → quantityOnHand < RESTOCK_THRESHOLD (default: 50)
    • ADEQUATE    → stock is fine
    • NOT_IN_CATALOG → SKU doesn't exist in our database

Step 3 — persistTrendSignals(enrichedProducts, keyword)
  For items that are BOTH trending AND low-stock:
  Upserts a row into trend_signals table.
  Keyed on (product_id, signal_source, signal_date) — no duplicate signals per day.
  Signal has a TTL (default 7 days) — after that, forecasting ignores it.

Step 4 — Returns analysis report
  { keyword, analyzedAt, summary: { totalTrending, lowStockAlerts, signalsWritten, ... }, trendingProducts }
```

**Constants (configurable via `.env`):**
- `TREND_RESTOCK_THRESHOLD` = 50 (default)
- `TREND_SIGNAL_TTL_DAYS` = 7 (default)
- `AI_SIGNAL_WEIGHT` = 1.8 (AI signals weighted higher than manual ones)

---

## 11. Forecast Engine

`GET /api/v1/forecast/:productId`

The forecast service:
1. Fetches all active (non-expired) trend signals for the product.
2. Calculates a weighted average trend score: `SUM(score × weight) / SUM(weight)`.
3. Multiplies by a demand multiplier to predict 30-day demand.
4. Calculates depletion days: `currentStock / dailyDemand`.
5. Returns `alertLevel`:
   - `CRITICAL` if depletion < 7 days
   - `MODERATE` if depletion < 20 days
   - `LOW` otherwise

---

## 12. Purchase Order Lifecycle

```
PENDING  →  APPROVED  →  DISPATCHED  →  RECEIVED
   │              │
   └──────────────┴──→  CANCELLED
```

| Status | Who Can Set It | What It Means |
|---|---|---|
| PENDING | Manager (on creation) | PO created, awaiting approval |
| APPROVED | Manager | Approved, sent to Warehouse |
| DISPATCHED | Warehouse | Goods left vendor facility |
| RECEIVED | Warehouse | Goods arrived, logged in warehouse |
| CANCELLED | Manager | Cancelled (terminal state) |

---

## 13. API Routes — Complete Map

All prefixed with `/api/v1`. Protected routes require Bearer JWT.

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | /auth/register | None | auth.controller → register |
| POST | /auth/login | None | auth.controller → login |
| GET | /auth/me | Any | auth.controller → me |
| GET | /products | Any | product.controller → list |
| POST | /products | ADMIN | product.controller → create |
| GET | /products/:id | Any | product.controller → getById |
| PUT | /products/:id | ADMIN | product.controller → update (with OCC) |
| DELETE | /products/:id | ADMIN | product.controller → softDelete |
| GET | /inventory | Any | inventory.controller → list |
| GET | /inventory/:id | Any | inventory.controller → getById |
| PATCH | /inventory/:id/adjust | ADMIN,MANAGER | inventory.controller → adjustStock |
| GET | /vendors | Any | vendor.controller → list |
| POST | /vendors | ADMIN | vendor.controller → create |
| GET | /signals | Any | signal.controller → list |
| POST | /signals/ingest | ADMIN | signal.controller → ingest |
| POST | /trends/analyze | ADMIN,MANAGER | trendAnalysis.controller → analyze |
| GET | /trends/signals | Any | trendAnalysis.controller → getSignals |
| GET | /forecast/:productId | Any | forecast.controller → getForecast |
| GET | /purchase-orders | Any | purchaseOrder.controller → list |
| POST | /purchase-orders | MANAGER,ADMIN | purchaseOrder.controller → create |
| PATCH | /purchase-orders/:id/status | MANAGER,ADMIN,WAREHOUSE | purchaseOrder.controller → updateStatus |

---

## 14. Environment Variables

File: `backend/.env` (copy from `.env.example`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | No | development | Controls logging, rate limits |
| `PORT` | No | 3000 | HTTP server port |
| `DB_HOST` | No | localhost | MySQL host |
| `DB_PORT` | No | 3306 | MySQL port |
| `DB_NAME` | No | ai_pulse_db | Database name |
| `DB_USER` | No | root | MySQL username |
| `DB_PASSWORD` | **Yes** | — | MySQL password |
| `JWT_SECRET` | No | fallback-dev | JWT signing secret |
| `JWT_EXPIRES_IN` | No | 24h | Token expiry |
| `GEMINI_API_KEY` | Optional | — | Google Gemini AI key |
| `BCRYPT_SALT_ROUNDS` | No | 12 | Password hashing cost |
| `RATE_LIMIT_MAX` | No | 100 | Requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | 900000 | Window (15 min) |
| `TREND_RESTOCK_THRESHOLD` | No | 50 | Low-stock threshold |
| `TREND_SIGNAL_TTL_DAYS` | No | 7 | Signal expiry in days |
| `CORS_ORIGIN` | No | localhost:4200 | Allowed frontend origin |
