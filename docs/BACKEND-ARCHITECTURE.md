# AI-Pulse — Backend Architecture Guide
## Complete Explanation From Basics

---

## 1. What Is This Project?

**AI-Pulse** is a **Predictive Inventory Management System**.

Think of a supermarket. Normally, they notice a product is out of stock *after* it runs out. AI-Pulse solves this by predicting demand *before* stock runs out — using Google Gemini AI to read trend keywords like "Winter sale" or "Diwali season" and figuring out which products will spike in demand.

**Real-world problem it solves:**
- A warehouse manager types "Summer sale" into the app.
- The AI analyzes which products will be in high demand (sunscreen, coolers, etc.).
- The system cross-checks: which of those products are already low on stock?
- It alerts the team: "Restock sunscreen — only 30 units left but demand is predicted to spike 80%."

---

## 2. What is a Backend?

The **backend** is the server-side part of the application — the code that runs on a server (not in the user's browser). It:
- Receives HTTP requests from the frontend (Angular app)
- Runs business logic (calculations, validations, rules)
- Reads/writes data in the database
- Returns JSON responses

Our backend is built with **Node.js** and **Express.js**.

**Node.js** = a runtime that lets you run JavaScript on a server (outside the browser).  
**Express.js** = a lightweight framework that makes it easy to create HTTP routes (URLs that the frontend can call).

---

## 3. Tech Stack — Every Tool Explained From Scratch

| Tool | What it is | Why we use it |
|---|---|---|
| **Node.js 18** | JavaScript runtime for servers | Fast, non-blocking — handles many requests simultaneously without waiting |
| **Express.js 4** | Web framework for Node.js | Makes defining routes (`GET /products`) simple with minimal boilerplate |
| **MySQL 8** | Relational database | Stores structured data: products, orders, users — all with relationships between tables |
| **Sequelize 6** | ORM (Object-Relational Mapper) | Lets us write JavaScript objects instead of raw SQL for most operations |
| **JWT (jsonwebtoken)** | JSON Web Token library | Creates signed auth tokens — no server-side sessions needed |
| **bcryptjs** | Password hashing library | Converts plain passwords into one-way hashes — original can never be recovered |
| **Joi** | Validation library | Validates request body shapes before controllers even run |
| **Winston** | Logging library | Structured logs with levels (info, debug, error) — better than `console.log` |
| **Helmet** | Security middleware | Automatically sets 14 HTTP security headers on every response |
| **dotenv** | Environment variable loader | Loads `.env` file values into `process.env` at startup |
| **Jest + Supertest** | Testing frameworks | Jest runs unit tests; Supertest makes real HTTP calls in tests |
| **Google Generative AI** | Gemini AI SDK | Lets us call Google's Gemini AI model from Node.js |

---

## 4. What is a REST API?

**REST API** = a set of URLs (endpoints) the frontend can call to get or send data.

Every request follows this pattern:
```
METHOD  URL                          Body (optional)
------  ---------------------------  ---------------
GET     /api/v1/products             (none — just fetching)
POST    /api/v1/auth/login           { "email": "...", "password": "..." }
PATCH   /api/v1/inventory/:id/adjust { "delta": -10, "version": 3 }
```

Every response from our API follows one envelope format:
```json
{
  "success": true,
  "data": { ... }
}
```
Or on error:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found"
  }
}
```

---

## 5. Project Folder Structure — Every File Explained

```
backend/
├── .env                  ← Your secret config (NEVER committed to Git)
├── .env.example          ← Template showing what variables are needed (safe to commit)
├── package.json          ← Lists all dependencies and npm scripts
└── src/
    ├── server.js         ← Entry point: starts the HTTP server on port 3000
    ├── app.js            ← Creates the Express app and registers all middleware/routes
    │
    ├── config/
    │   ├── db.config.js  ← Connects to MySQL using Sequelize
    │   └── jwt.config.js ← Reads JWT_SECRET and JWT_EXPIRES_IN from .env
    │
    ├── controllers/      ← Handle HTTP requests/responses — no business logic here
    │   ├── auth.controller.js
    │   ├── inventory.controller.js
    │   ├── product.controller.js
    │   ├── purchaseOrder.controller.js
    │   ├── signal.controller.js
    │   ├── trendAnalysis.controller.js
    │   ├── forecast.controller.js
    │   └── vendor.controller.js
    │
    ├── services/         ← All business logic lives here
    │   ├── inventory.service.js
    │   ├── product.service.js
    │   ├── vendor.service.js
    │   └── TrendAnalysisService.js  ← AI pipeline
    │
    ├── repositories/     ← All database queries live here
    │   └── inventory.repository.js  ← Raw SQL for atomic stock updates
    │
    ├── models/           ← Sequelize model definitions (one per database table)
    │   └── index.js      ← Loads all models and sets up associations
    │
    ├── middlewares/      ← Code that runs on every request before the controller
    │   ├── auth.middleware.js         ← Verifies JWT token + checks roles
    │   ├── errorHandler.middleware.js ← Catches ALL errors and returns proper HTTP responses
    │   ├── rateLimiter.middleware.js  ← Blocks too many requests from one IP
    │   └── validate.middleware.js     ← Validates request body with Joi schemas
    │
    ├── routes/           ← Maps URLs to controller functions
    │   ├── index.js               ← Mounts all routers under /api/v1
    │   ├── auth.routes.js
    │   ├── inventory.routes.js
    │   ├── product.routes.js
    │   ├── purchaseOrder.routes.js
    │   ├── signal.routes.js
    │   ├── trendAnalysis.routes.js
    │   ├── forecast.routes.js
    │   └── vendor.routes.js
    │
    ├── schemas/          ← Joi validation schemas (shape of expected request bodies)
    │   └── trendAnalysis.schema.js
    │
    ├── errors/
    │   └── AppError.js   ← Custom error class with statusCode + message
    │
    └── utils/
        ├── logger.js        ← Winston logger setup
        └── auth.helpers.js  ← signUserToken(), publicUser() helper functions
```

---

## 6. The 3-Layer Architecture Pattern

This is the most important concept to understand. Every feature follows **Controller → Service → Repository**.

### Why 3 layers?

Imagine a restaurant:
- **Waiter (Controller)** — takes your order, brings your food. Doesn't cook.
- **Chef (Service)** — applies cooking rules and recipes. Doesn't talk to customers.
- **Pantry (Repository)** — stores and retrieves ingredients. Doesn't know what dish is being made.

Each layer has ONE job. This makes the code testable and maintainable.

```
HTTP Request arrives
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  CONTROLLER  (e.g., inventory.controller.js)            │
│  • Reads: req.params, req.body, req.query               │
│  • Calls the service                                    │
│  • Sends: res.status(200).json({ success: true, data }) │
│  • NEVER contains SQL or business logic                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  SERVICE  (e.g., inventory.service.js)                  │
│  • Contains ALL business rules                          │
│  • "Is the version number correct?"                     │
│  • "Is the new stock level valid?"                      │
│  • Throws AppError if something is wrong                │
│  • NEVER knows about req/res or HTTP status codes       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  REPOSITORY  (e.g., inventory.repository.js)            │
│  • Contains ALL SQL / Sequelize queries                  │
│  • Returns plain JavaScript objects                     │
│  • NEVER contains business rules                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
                    MySQL Database
```

**Example — Adjusting Stock:**
1. `PATCH /inventory/:id/adjust` hits the **Controller**
2. Controller calls `inventoryService.adjustStock(id, delta, version)`
3. Service validates the delta, checks the version
4. Service calls `inventoryRepository.updateStockWithHistory(...)` 
5. Repository runs the atomic SQL UPDATE
6. Result bubbles back up → Controller sends `200 OK`

---

## 7. How server.js and app.js Work Together

### `server.js` — The Starter
```js
const app = require('./app');
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```
This is the entry point. Run `node src/server.js` and the server starts. It just calls `app.listen()`.

### `app.js` — The Builder
This file creates the Express app and registers everything in the correct order:

```
1. helmet()           → adds security headers to every response
2. cors()             → only allows requests from localhost:4200
3. express.json()     → parses incoming JSON bodies (req.body)
4. morgan()           → logs every request: "GET /api/v1/products 200 45ms"
5. rateLimiter        → blocks IPs that make too many requests
6. Routes             → your actual API endpoints
7. 404 handler        → catches unknown URLs
8. errorHandler       → catches ALL errors thrown anywhere in the app
```

**Order matters!** The error handler MUST be last. If it's registered before routes, it won't catch route errors.

---

## 8. Middleware — What It Is and Why It Matters

**Middleware** = a function that runs between receiving a request and sending a response.

Think of airport security: every passenger (request) must go through metal detectors (middleware) before boarding (reaching the controller).

```js
// Middleware signature:
(req, res, next) => {
  // do something
  next(); // pass to next middleware or controller
}
```

If `next()` is not called, the request hangs forever. If `next(err)` is called with an error, Express skips to the error handler.

### `auth.middleware.js` — How JWT Verification Works

**What is JWT?**  
JWT (JSON Web Token) is a signed string that proves who you are. It looks like:
```
eyJhbGci.eyJ1c2VySWQiOiIx.SflKxwRJSMeK
  [header]   [payload]      [signature]
```
The server signs the token when you log in. On every future request, you send it back. The server verifies the signature — no database lookup needed.

**Step by step:**
```
1. Client sends: Authorization: Bearer eyJhbGci...
2. auth.middleware extracts the token after "Bearer "
3. jwt.verify(token, JWT_SECRET) — checks signature + expiry
4. If valid, decoded payload = { id, email, role, iat, exp }
5. Role check: is decoded.role in allowedRoles array?
6. If yes → req.user = decoded → next()
7. If no → next(new AppError('Access denied', 403))
```

```js
// Usage in routes:
router.post('/analyze', auth(['ADMIN', 'MANAGER']), ctrl.analyzeTrend);
// Only ADMIN and MANAGER can POST to /analyze
```

### `errorHandler.middleware.js` — Central Error Handling

Instead of handling errors in every controller, all errors are thrown and caught here:

```js
// Controller just throws — doesn't handle the error
throw new AppError('Product not found', 404);

// errorHandler catches it, formats the response:
res.status(404).json({
  success: false,
  error: { code: 'NOT_FOUND', message: 'Product not found' }
});
```

**Error type → HTTP status mapping:**

| Error Type | HTTP Status |
|---|---|
| AppError (our custom error) | Whatever statusCode was set (400, 403, 404, etc.) |
| SequelizeValidationError | 422 Unprocessable Entity |
| SequelizeUniqueConstraintError | 409 Conflict |
| JsonWebTokenError | 401 Unauthorized |
| TokenExpiredError | 401 Unauthorized |
| SyntaxError (bad JSON body) | 400 Bad Request |
| Anything else | 500 Internal Server Error |

Stack traces are only included in `development` mode — never sent to users in production.

---

## 9. Authentication Flow — Login to API Call

Here is the complete flow from a user entering their password to making a protected API call:

```
Step 1 — User submits login form
  POST /api/v1/auth/login
  Body: { "email": "admin@aipulse.com", "password": "Admin@123!" }

Step 2 — auth.controller.js runs login()
  • Finds user by email in the users table
  • bcrypt.compare("Admin@123!", storedHash) → true/false
  • If true: creates JWT token containing { id, name, email, role }
  • Response: { token: "eyJ...", user: { id, name, email, role } }

Step 3 — Frontend stores token
  localStorage.setItem('ai_pulse_token', 'eyJ...')

Step 4 — Every future API call
  AuthInterceptor (Angular) adds header automatically:
  Authorization: Bearer eyJ...

Step 5 — Backend verifies on every protected route
  auth.middleware.js verifies signature + checks role
  Sets req.user = { id, email, role }
  Controller can read req.user.role to know who is calling
```

**Why bcrypt?**  
bcrypt is a one-way hash. You can never reverse it back to the original password. Even if the database is stolen, attackers can't recover passwords. We use 12 salt rounds — this makes brute-force attacks take years per password.

---

## 10. Optimistic Concurrency Control (OCC)

### The Problem — Race Conditions

Imagine two warehouse workers are looking at the same screen:
- Both see: Stock = 50 units
- Worker A ships 10 units → sends PATCH with delta = -10
- Worker B ships 15 units → sends PATCH with delta = -15 (at the same millisecond)

Without any protection, both read 50, both write back 40 and 35 respectively. The final value is 35 — but it should be 25 (50 - 10 - 15). **Data corruption.**

### The Solution — Version Numbers

Every inventory record has a `version` column (integer, starts at 1).

**Flow:**
```
1. Worker A reads: { stock: 50, version: 3 }
2. Worker B reads: { stock: 50, version: 3 }  (same data)

3. Worker A sends: PATCH { delta: -10, version: 3 }
   SQL runs:
     UPDATE inventory
     SET quantity_on_hand = quantity_on_hand - 10,
         version = version + 1
     WHERE id = :id AND version = 3
   → affectedRows = 1 ✅ (version was 3, now becomes 4)

4. Worker B sends: PATCH { delta: -15, version: 3 }
   SQL runs:
     UPDATE inventory
     SET quantity_on_hand = quantity_on_hand - 15,
         version = version + 1
     WHERE id = :id AND version = 3
   → affectedRows = 0 ❌ (version is now 4, not 3!)
   → Service throws: AppError('Conflict', 409)
   → Worker B must re-fetch and retry
```

**The atomic SQL query:**
```sql
UPDATE inventory
SET
  quantity_on_hand = quantity_on_hand + :delta,
  version          = version + 1,
  updated_at       = NOW()
WHERE
      id      = :id
  AND version = :version
  AND (quantity_on_hand + :delta) >= 0
```

**Why raw SQL instead of Sequelize ORM?**  
The ORM would do: `fetch → change in JS → save`. That is 2 separate operations. Between fetch and save, another update can happen. Our raw SQL is ONE atomic MySQL operation — the database evaluates everything in a single, indivisible step.

---

## 11. The AI Trend Analysis Pipeline

This is the most complex feature. It runs when an admin types a keyword like "Winter sale" and clicks "Analyze with AI".

### Step-by-step flow:

```
POST /api/v1/trends/analyze
Body: { "keyword": "Winter sale" }
         │
         ▼
trendAnalysis.controller.js
  → calls TrendAnalysisService.analyzeKeyword("Winter sale")
         │
         ▼
STEP 1: callGeminiAI("Winter sale")
  Sends this prompt to Google Gemini 2.5 Flash:
  
  "You are an expert retail demand forecasting AI.
   Analyze 'Winter sale'. Return ONLY a JSON array:
   [{ sku, productName, category, trendScore, reason }]"
  
  Gemini responds with (example):
  [
    { sku: "CLTH-JKT-002", productName: "Winter Jacket", trendScore: 0.92, reason: "..." },
    { sku: "SPRT-SKI-001", productName: "Ski Boots", trendScore: 0.85, reason: "..." }
  ]
  
  Defensive parsing: strips markdown ``` fences if model adds them
         │
         ▼
STEP 2: crossReferenceInventory(aiProducts)
  Takes Gemini's SKU list → runs ONE JOIN query:
    SELECT products.*, inventory.*
    FROM products
    JOIN inventory ON products.id = inventory.product_id
    WHERE products.sku IN ('CLTH-JKT-002', 'SPRT-SKI-001', ...)
  
  For each product, calculates totalOnHand (sum across all warehouse locations)
  
  Classifies each:
    • LOW_STOCK      → totalOnHand < 50 (RESTOCK_THRESHOLD)
    • ADEQUATE       → stock is fine
    • NOT_IN_CATALOG → SKU doesn't exist in our database
         │
         ▼
STEP 3: persistTrendSignals(enrichedProducts, keyword)
  For items that are BOTH trending AND low-stock:
  → Upsert a row into trend_signals table
  → Keyed on (product_id, signal_source, signal_date) — no duplicate signals per day
  → Signal expires after 7 days (TREND_SIGNAL_TTL_DAYS)
  → signal_score = AI's trendScore, weight = 1.8 (AI signals trusted more)
         │
         ▼
STEP 4: Return analysis report
  {
    keyword: "Winter sale",
    analyzedAt: "2026-06-04T...",
    summary: {
      totalTrending: 6,
      lowStockAlerts: 2,
      signalsWritten: 2,
      notInCatalog: 1
    },
    trendingProducts: [...]
  }
```

### What is `gemini-2.5-flash`?
It is Google's current stable AI model (as of 2026) — fast, cost-effective, and great for text generation tasks like our structured JSON prompt. We previously used `gemini-1.5-flash` but that model was **shut down by Google** in 2026. We updated to `gemini-2.5-flash` to fix this.

---

## 12. The Forecast Engine

`GET /api/v1/forecast/:productId`

Once trend signals are written, the forecast engine reads them:

```
1. Fetch all ACTIVE (non-expired) trend signals for the product
2. Weighted average trend score:
   score = SUM(signalScore × weight) / SUM(weight)
3. Predicted daily demand = baselineDemand × (1 + score)
4. Depletion days = currentStock / predictedDailyDemand
5. Alert level:
   • CRITICAL → depletion < 7 days
   • MODERATE → depletion < 20 days
   • LOW       → everything is fine
```

---

## 13. Purchase Order Lifecycle

A Purchase Order (PO) tracks when goods are ordered from a vendor.

```
[Manager creates PO]
       │
       ▼
   PENDING  ──────────────────────→  CANCELLED
       │                                  ↑
       ▼                                  │
   APPROVED  ─────────────────────→  CANCELLED
       │
       ▼ (Warehouse marks goods as shipped)
  DISPATCHED
       │
       ▼ (Warehouse confirms goods received)
   RECEIVED  (terminal — cannot change further)
```

**Who can do what:**
| Action | Role |
|---|---|
| Create PO | MANAGER, ADMIN |
| Approve PO | MANAGER, ADMIN |
| Cancel PO | MANAGER, ADMIN |
| Mark DISPATCHED | WAREHOUSE, MANAGER, ADMIN |
| Mark RECEIVED | WAREHOUSE, MANAGER, ADMIN |

---

## 14. Database Models (Tables)

Each Sequelize model maps to a MySQL table:

| Model | Table | What It Stores |
|---|---|---|
| `User` | `users` | Login accounts with roles |
| `Product` | `products` | SKU, name, category, price |
| `Inventory` | `inventory` | Stock levels per warehouse location |
| `Vendor` | `vendors` | Supplier names and contacts |
| `PurchaseOrder` | `purchase_orders` | PO header (vendor, status, total) |
| `PurchaseOrderLine` | `purchase_order_lines` | Individual line items inside a PO |
| `TrendSignal` | `trend_signals` | AI-generated demand signals |
| `InventoryAuditLog` | `inventory_audit_log` | History of every stock adjustment |

**Relationships:**
```
Product ──has many──→ Inventory (one product in multiple locations)
Product ──has many──→ TrendSignal
Vendor  ──has many──→ PurchaseOrder
PurchaseOrder ──has many──→ PurchaseOrderLine
PurchaseOrderLine ──belongs to──→ Product
```

---

## 15. All API Routes

All routes are prefixed with `/api/v1`:

| Method | Path | Who Can Call | What It Does |
|---|---|---|---|
| POST | /auth/register | Anyone | Create a new user account |
| POST | /auth/login | Anyone | Login, get JWT token |
| GET | /auth/me | Logged in | Get current user info |
| GET | /products | Anyone | List all products |
| POST | /products | ADMIN | Create a product |
| GET | /products/:id | Anyone | Get one product |
| PUT | /products/:id | ADMIN | Update a product |
| DELETE | /products/:id | ADMIN | Soft-delete a product |
| GET | /inventory | Anyone | List all inventory records |
| GET | /inventory/:id | Anyone | Get one inventory record |
| PATCH | /inventory/:id/adjust | ADMIN, MANAGER | Adjust stock (OCC) |
| GET | /vendors | Anyone | List vendors |
| POST | /vendors | ADMIN | Create vendor |
| GET | /trends/signals | Anyone | Get trend signals for dashboard |
| POST | /trends/analyze | ADMIN, MANAGER | Run AI analysis |
| GET | /forecast/:productId | Anyone | Get 30-day forecast |
| GET | /purchase-orders | Anyone | List purchase orders |
| POST | /purchase-orders | MANAGER, ADMIN | Create a PO |
| PATCH | /purchase-orders/:id/status | MANAGER, ADMIN, WAREHOUSE | Update PO status |

---

## 16. Environment Variables — Why They Exist

**Problem:** If you hardcode your database password in `db.config.js` and commit to GitHub, your password is exposed forever.

**Solution:** Store secrets in a `.env` file that is **never committed to Git**.

The `.env` file is loaded by `dotenv` at startup, and values become available as `process.env.VARIABLE_NAME`.

| Variable | What It Is | Example Value |
|---|---|---|
| `PORT` | Which port the server listens on | `3000` |
| `NODE_ENV` | Running mode (affects logging, security) | `development` |
| `DB_HOST` | MySQL server address | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_NAME` | Database name | `ai_pulse_db` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password — **NEVER hardcode this** | `yourpassword` |
| `JWT_SECRET` | Secret key used to sign/verify tokens | 64-char random hex string |
| `JWT_EXPIRES_IN` | How long a token stays valid | `90d` |
| `GEMINI_API_KEY` | Your Google AI Studio API key | `AIzaSy...` |
| `CORS_ORIGIN` | Which frontend URL is allowed | `http://localhost:4200` |
| `TREND_RESTOCK_THRESHOLD` | Stock level considered "low" | `50` |
| `TREND_SIGNAL_TTL_DAYS` | How many days a signal stays active | `7` |

---

## 17. Security — How the API is Protected

| Layer | What Protects It | How |
|---|---|---|
| **HTTP Headers** | `helmet` middleware | Adds headers like `X-Frame-Options`, `Content-Security-Policy` to prevent XSS/clickjacking |
| **CORS** | `cors` middleware | Only requests from `CORS_ORIGIN` (your Angular app) are accepted |
| **Auth** | JWT Bearer tokens | Every protected route verifies the token signature before running |
| **Passwords** | `bcrypt` (12 rounds) | Passwords are hashed — even we can't see your password |
| **Rate Limiting** | `express-rate-limit` | Max 100 requests per IP per 15 minutes |
| **Input Validation** | `Joi` schemas | Malformed request bodies are rejected with 422 before controllers run |
| **Error Safety** | `errorHandler` | Stack traces never sent to users in production |
| **Secrets** | `.env` + `.gitignore` | Passwords/API keys never committed to source control |

---

## 18. Bug Fixed — AI Search Not Working

**Date:** June 4, 2026  
**Symptom:** Clicking "Analyze with AI" showed an error snackbar. Backend returned HTTP 500.

**Root Cause:**
```
[GoogleGenerativeAI Error]: 404 Not Found
models/gemini-1.5-flash is not found for API version v1beta
```
Google shut down the `gemini-1.5-flash` model in 2026.

**Fix — One Line Change in `TrendAnalysisService.js`:**
```js
// BEFORE (broken — model no longer exists):
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// AFTER (fixed — current stable model):
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
```

`gemini-2.5-flash` is Google's current recommended model — faster, smarter, and actively maintained.

---

## 19. How to Run the Backend

```bash
# 1. Enter the backend folder
cd backend

# 2. Install all dependencies
npm install

# 3. Create your .env file (copy the template)
copy .env.example .env
# Then open .env and fill in: DB_PASSWORD and GEMINI_API_KEY

# 4. Set up the database (first time only)
mysql -u root -p < ../database/schema.sql
mysql -u root -p < ../database/seed.sql

# 5. Start the server
npm run dev       # Development mode (auto-restarts on file change)
# OR
npm start         # Production mode
```

The server will print:
```
✅  MySQL connection established via Sequelize.
🚀  AI-Pulse API running → http://localhost:3000
```

---

## 20. Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run lint (code style check)
npm run lint
```

**Jest** is the testing framework. Tests live in `backend/tests/`.

Tests mock the database layer — no real MySQL connection needed to run tests. This is why CI/CD works without a database.

---

## 21. Glossary of Terms

| Term | Plain English Explanation |
|---|---|
| **REST API** | A set of URLs a frontend can call to get/send data |
| **Middleware** | Code that runs on every request before the controller |
| **JWT** | A signed token proving who you are — no database lookup needed |
| **bcrypt** | A one-way password hashing function |
| **ORM** | Tool that lets you write JS objects instead of raw SQL |
| **OCC** | Version-based system to prevent two people updating the same data simultaneously |
| **Race Condition** | When two operations run at the same time and corrupt each other's data |
| **Atomic Operation** | A database operation that either fully succeeds or fully fails — never half-done |
| **Repository Pattern** | Design rule: all database queries go in one layer (the repository) |
| **Layered Architecture** | Controller → Service → Repository — each layer has one job |
| **Soft Delete** | Mark a record as `isActive: false` instead of actually deleting it |
| **Signal TTL** | Time-to-live — how long a trend signal stays valid before expiring |
| **Upsert** | INSERT if the row doesn't exist, UPDATE if it does |
| **BehaviorSubject** | RxJS class (Angular) that always emits the latest value to new subscribers |
| **Environment Variable** | Config value loaded from `.env` — never hardcoded in source code |
| **CORS** | Browser security rule: a website can only call APIs on the same origin (unless explicitly allowed) |
| **Helmet** | npm package that sets security HTTP response headers automatically |
