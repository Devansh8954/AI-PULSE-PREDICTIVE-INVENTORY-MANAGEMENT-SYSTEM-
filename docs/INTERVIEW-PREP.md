# 🎯 AI-Pulse — Interview Preparation Guide

> All questions are based on your **actual code**. Answers reference specific files and line numbers.  
> Read the answer, understand it, then practice saying it out loud.

---

## 📌 THE 30-SECOND PROJECT PITCH (Memorize This First)

> *"I built AI-Pulse — a full-stack predictive inventory management system. The backend is Node.js + Express with a strict Controller → Service → Repository architecture, the frontend is Angular 17 with role-based route guards, and the database is MySQL 8. The system has four role-based dashboards, JWT authentication, and integrates Google's Gemini AI to analyze trend keywords and predict which products will face a demand spike. The most interesting engineering problem I solved was implementing Optimistic Concurrency Control to prevent race conditions when multiple warehouse workers update the same stock record simultaneously."*

---

## SECTION 1 — ARCHITECTURE QUESTIONS

---

### Q1. Walk me through the overall architecture of your project.

**Answer:**
> AI-Pulse has three layers:
> 1. **Frontend** — Angular 17 SPA with 4 role-based dashboards (Admin, Manager, Analyst, Warehouse). Angular Route Guards prevent unauthorized access.
> 2. **Backend** — Node.js + Express REST API. Strictly layered: every request flows through Controller → Service → Repository. No SQL leaks into controllers, no HTTP logic leaks into services.
> 3. **Database** — MySQL 8 with a normalized schema (3NF). Key tables: `products`, `inventory`, `vendors`, `trend_signals`, `purchase_orders`, `inventory_audit_log`.
>
> The frontend communicates with the backend via REST + JWT. The backend calls Google Gemini AI for trend analysis and writes results back to MySQL.

**Draw this if asked:**
```
Browser (Angular) → REST/JWT → Express API → Service Layer → Repository → MySQL
                                                           → Google Gemini AI
```

---

### Q2. Why did you choose Controller → Service → Repository pattern?

**Answer:**
> It enforces separation of concerns. Each layer has one job:
> - **Controller** — parses the HTTP request, calls a service method, formats the HTTP response. It never touches the database.
> - **Service** — contains business logic and domain rules (e.g., "delta cannot exceed 10,000 units", "version must be non-negative"). It never knows about `req` or `res`.
> - **Repository** — contains all SQL queries. Only place in the codebase that talks to MySQL.
>
> This makes each layer independently testable. I can unit test the service by mocking the repository, without needing a real database.

**File reference:** `backend/src/services/inventory.service.js` — the service calls `InventoryRepository.updateStockWithHistory()`, never writes SQL itself.

---

### Q3. Why did you use Angular over React?

**Answer:**
> Angular is an opinionated, batteries-included framework — it enforces a consistent project structure with modules, services, guards, and interceptors. For an enterprise inventory system with 4 roles and complex navigation rules, Angular's `AuthGuard` + `RoleGuard` pattern is cleaner than building that from scratch in React. Angular also has RxJS built in, which makes handling async data streams and HTTP requests more predictable. React is more flexible, but flexibility means more architectural decisions you have to make yourself.

---

### Q4. How does your frontend handle routing and access control?

**Answer:**
> I use two Angular guards:
> 1. **`AuthGuard`** — runs on every protected route. Checks if a valid JWT token exists in localStorage. If not, redirects to `/login`.
> 2. **`RoleGuard`** — checks the decoded JWT's `role` field against the `allowedRoute` data on each route. For example, only `ADMIN` can access `/dashboard`, only `MANAGER` and `ADMIN` can access `/manager`.
>
> This is enforced both in the Angular routing (`app-routing.module.ts`) AND in the backend middleware, so even if someone bypasses the frontend, the API will reject the request with a 403.

**File reference:** `frontend/src/app/app-routing.module.ts` — every protected route has `canActivate: [RoleGuard]`.

---

## SECTION 2 — BACKEND & API QUESTIONS

---

### Q5. How does your authentication work?

**Answer:**
> I use **JWT (JSON Web Tokens)** with `jsonwebtoken` and password hashing with `bcryptjs`.
>
> **Login flow:**
> 1. User sends `POST /api/v1/auth/login` with email + password.
> 2. Backend fetches the user from DB, compares the submitted password against the stored bcrypt hash using `bcrypt.compare()`.
> 3. If valid, the server signs a JWT containing `{ id, email, role }` with a secret key and sends it back.
> 4. The client stores the JWT and sends it on every subsequent request as `Authorization: Bearer <token>`.
> 5. The `auth` middleware verifies the token signature and expiry on every protected route.
>
> Passwords are **never stored in plaintext** — only the bcrypt hash is saved.

**File reference:** `backend/src/middlewares/auth.middleware.js`

---

### Q6. What happens if someone sends an expired or fake JWT?

**Answer:**
> The `auth` middleware calls `jwt.verify(token, secret)`. If the token is expired, `jsonwebtoken` throws a `TokenExpiredError`. If the signature is invalid (faked), it throws a `JsonWebTokenError`. Both are caught by the global error handler middleware, which maps them to a `401 Unauthorized` response. The request never reaches the controller.

---

### Q7. What is the difference between a 401 and a 403 in your API?

**Answer:**
> - **401 Unauthorized** — the user is not logged in (no token or invalid token). *"I don't know who you are."*
> - **403 Forbidden** — the user is logged in but their role doesn't allow this action. *"I know who you are, but you can't do this."*
>
> In my auth middleware, if `allowedRoles` is set and the user's role is not in it, I return 403 with a message like: `"Access denied. Required roles: [ADMIN]. Your role: WAREHOUSE."`

**File reference:** `backend/src/middlewares/auth.middleware.js` — line 46-52.

---

### Q8. How did you handle request validation?

**Answer:**
> I use **Joi** for schema-based request validation. I have a `validate.middleware.js` that takes a Joi schema as an argument and returns an Express middleware. If the request body doesn't match the schema, it returns a 400 with a clear error message before the request reaches the controller. This keeps controllers clean — they never do manual `if (!req.body.keyword)` checks.

---

### Q9. What security measures did you implement?

**Answer:**
> Several layers:
> 1. **Helmet** — sets secure HTTP headers (X-Content-Type-Options, X-Frame-Options, CSP, etc.)
> 2. **CORS** — configured to only allow requests from the frontend origin.
> 3. **Rate Limiting** — `express-rate-limit` prevents brute-force attacks on the auth endpoints.
> 4. **bcrypt** — passwords hashed before storage, never logged or returned.
> 5. **JWT** — stateless, signed tokens. API keys (Gemini) loaded from `.env`, never hardcoded.
> 6. **Joi validation** — all inputs validated before processing.
> 7. **RBAC middleware** — every route declares its required roles explicitly.

---

## SECTION 3 — THE HARDEST QUESTIONS (OCC & Concurrency)

---

### Q10. ⭐ What is Optimistic Concurrency Control and why did you use it?

**Answer (practice this word for word):**
> Imagine two warehouse workers open the same inventory record at the same time. Worker A sees `quantity = 100, version = 5`. Worker B also sees `quantity = 100, version = 5`. Worker A removes 10 units and saves — now DB has `quantity = 90, version = 6`. Worker B also tries to remove 10 units, but they're working from the stale version 5. Without OCC, the DB would blindly accept Worker B's write, resulting in `quantity = 90` instead of the correct `quantity = 80`. This is called a lost update.
>
> OCC prevents this by adding a `version` column. Every read returns the current version. Every write must include that version in the `WHERE` clause. If the version no longer matches (because someone else updated first), `affectedRows = 0` and I return a `409 Conflict`. The client must re-fetch the latest data and retry.

**The SQL I wrote:**
```sql
UPDATE inventory
SET
  quantity_on_hand = quantity_on_hand + :delta,
  version          = version + 1,
  updated_at       = NOW()
WHERE
      id      = :id
  AND version = :version          -- OCC guard
  AND (quantity_on_hand + :delta) >= 0  -- prevent negative stock
```

**File reference:** `backend/src/repositories/inventory.repository.js` — `updateStockWithHistory()`.

---

### Q11. Why did you use raw SQL for the stock update instead of Sequelize ORM?

**Answer:**
> Because the ORM alternative is unsafe under concurrency. The ORM way would be:
> 1. Read the record (`quantity = 100`)
> 2. Add delta in JavaScript (`newQty = 100 + delta`)
> 3. Save the new value
>
> This is a **read-modify-write** sequence — three separate operations. Between step 1 and step 3, another request could modify the same record. This is called a TOCTOU race (Time-of-Check / Time-of-Use).
>
> My raw SQL does `quantity_on_hand = quantity_on_hand + :delta` — this is a **single atomic expression evaluated inside MySQL's InnoDB engine**. The database guarantees atomicity. No race window exists.

---

### Q12. What is a TOCTOU race condition?

**Answer:**
> TOCTOU stands for Time-of-Check / Time-of-Use. It's a concurrency bug where the state of a resource changes between the moment you check it and the moment you use it. In my case: I read the inventory quantity (check), then compute the new value (use) — but between those two moments, another request could have already changed the quantity. By using a single atomic SQL expression, I eliminate the gap between check and use.

---

### Q13. What happens when an OCC conflict occurs? What does the client do?

**Answer:**
> The server returns `HTTP 409 Conflict` with a `ConcurrentUpdateError`. The error message tells the client: "The record was modified by another request since you last read it. Re-fetch and retry." The correct client behavior is:
> 1. Re-fetch the inventory record via `GET /api/v1/inventory/:id` to get the latest `version`.
> 2. Apply their delta to the new quantity.
> 3. Retry the `PATCH` request with the updated `version`.
>
> This is called the **optimistic retry pattern**. It's "optimistic" because we assume conflicts are rare — we don't lock the row upfront (which would kill performance), we only detect conflicts at write time.

---

### Q14. What is the difference between Optimistic and Pessimistic Locking?

**Answer:**
> - **Pessimistic Locking** — lock the row before reading it (`SELECT ... FOR UPDATE`). No one else can read or write until you release the lock. Safe, but slow — it serializes all access and kills throughput.
> - **Optimistic Locking** — don't lock. Let everyone read freely. At write time, check if anyone else wrote since your read (using the version number). If yes, fail fast with 409. If no, proceed.
>
> OCC is better for inventory systems where reads are very frequent and write conflicts are relatively rare. Pessimistic locking would create a bottleneck at peak times (e.g., flash sale).

---

## SECTION 4 — AI & GEMINI INTEGRATION

---

### Q15. ⭐ How does your AI integration work? Walk me through the code.

**Answer:**
> The AI pipeline has 4 steps, all in `TrendAnalysisService.js`:
>
> **Step 1 — Build a structured prompt.** I send Gemini a carefully engineered prompt that instructs it to return ONLY a valid JSON array — no markdown, no prose. Each object has `sku`, `productName`, `category`, `trendScore` (0.0–1.0), and `reason`.
>
> **Step 2 — Call Gemini API.** I use `@google/generative-ai` SDK with the `gemini-1.5-flash` model. The raw response text is stripped of any accidental markdown code fences (the model sometimes wraps output in ` ```json ` despite instructions), then parsed with `JSON.parse()`.
>
> **Step 3 — Cross-reference inventory.** I take the SKUs Gemini returned and look them up in my database. For each match, I check if `quantity_on_hand < RESTOCK_THRESHOLD (50)`. Items below the threshold are tagged `LOW_STOCK`.
>
> **Step 4 — Persist signals.** For items that are both LOW_STOCK AND trending, I upsert a row in the `trend_signals` table. I use upsert (INSERT ON DUPLICATE KEY UPDATE) keyed on `(product_id, signal_source, signal_date)` to avoid duplicates if the same keyword is analyzed twice in a day.

---

### Q16. What if the Gemini API is down or returns invalid JSON?

**Answer:**
> I handle both cases defensively:
> - **Invalid JSON**: I strip markdown fences first, then `JSON.parse()` inside a try/catch. If parsing fails, I throw an `AppError` with HTTP `502 Bad Gateway` — meaning "I got a bad response from an upstream service."
> - **Missing API key**: The `getGeminiClient()` function checks for `GEMINI_API_KEY` at call time, not at module load time. This means the server boots and runs normally without the key — only the `/trends/analyze` endpoint fails with a `503 Service Unavailable`. All other dashboards keep working.
> - **API completely down**: The error propagates up, gets caught by the global error handler, and returns a 502. I could improve this by adding a retry with exponential backoff.

---

### Q17. What is the `AI_SIGNAL_WEIGHT = 1.8` in your code?

**Answer:**
> It's the weight multiplier applied to AI-generated trend signals in the forecasting formula. Manual signals have weight `1.0` (baseline). AI-generated signals from Gemini get `1.8` because they're data-driven and more reliable than a human manually entering a trend. The forecasting engine multiplies `signal_score × weight` when computing the 30-day demand prediction, so AI signals have nearly twice the influence of manual ones.

---

## SECTION 5 — DATABASE QUESTIONS

---

### Q18. What is database normalization and how did you apply it?

**Answer:**
> Normalization eliminates data redundancy. My schema is in **3NF (Third Normal Form)**:
> - `products` and `inventory` are separate tables. Why? Because quantity changes very frequently but product name rarely changes. If they were in one table, every stock update would touch the product name column unnecessarily.
> - `vendors` is a separate table. Why? If vendor details were stored in `inventory`, changing a vendor's phone number would require updating every inventory row — that's an update anomaly.
> - Each table has one primary key and all non-key columns depend only on that key.

---

### Q19. Why does your `inventory` table have both `quantity_reserved` and `quantity_on_hand`?

**Answer:**
> `quantity_on_hand` is the physical stock — what's actually on the shelf. `quantity_reserved` is stock committed to open orders but not yet shipped — it's a "soft lock". The **available quantity** for new orders is `quantity_on_hand - quantity_reserved`. This prevents overselling: if 100 units are on hand but 80 are reserved for pending orders, only 20 are available for new orders.

---

### Q20. Why did you use `CHAR(36)` for primary keys instead of `INT AUTO_INCREMENT`?

**Answer:**
> I used UUID (`CHAR(36)`) for primary keys because:
> 1. **No sequential enumeration** — an attacker can't guess IDs by incrementing. `GET /products/1`, `/products/2` is a security risk. UUIDs are not guessable.
> 2. **Distributed safe** — if you ever shard the database or merge datasets, UUID collisions are astronomically unlikely. Sequential integers would clash.
>
> The trade-off is slightly more storage and slightly slower index lookups, but for this scale it's negligible.

---

### Q21. What are your database indexes and why did you add them?

**Answer:**
> I added indexes on columns that are frequently used in WHERE clauses:
> - `idx_inventory_low_stock (quantity_on_hand, reorder_point)` — the low-stock alert query filters `WHERE quantity_on_hand <= reorder_point`. Without this index, MySQL does a full table scan.
> - `idx_signal_product_date (product_id, signal_date)` — the forecasting query filters signals by product and date range.
> - `idx_product_category (category)` — product listing supports `?category=ELECTRONICS` filter.
>
> Indexes speed up reads but slow down writes (index must be updated on every INSERT/UPDATE). I only added indexes on columns I actually query on.

---

### Q22. What is a soft delete and why did you use it?

**Answer:**
> Instead of `DELETE FROM products WHERE id = ?`, I set `is_active = false` and `deleted_at = NOW()`. The row stays in the database. This is a soft delete.
>
> Why? Because `products` is referenced by `inventory`, `trend_signals`, and `purchase_orders` via foreign keys. A hard delete would either cascade-delete all related records (destroying historical data) or be rejected by MySQL's foreign key constraint. Soft delete preserves the audit trail — you can always see what products existed and what orders were placed against them.

---

### Q23. What is the `inventory_audit_log` table for?

**Answer:**
> It's an **append-only ledger** of every stock movement. Every time `PATCH /inventory/:id/adjust` succeeds, my repository writes a row to `inventory_audit_log` inside the same database transaction. The row records: which inventory record changed, how much delta, who made the change, why, and what version it resulted in. You can reconstruct the full history of any inventory record by reading its audit log. You can never UPDATE or DELETE audit log rows — it's immutable.

---

## SECTION 6 — CI/CD & TESTING

---

### Q24. What does your CI/CD pipeline do?

**Answer:**
> I have a GitHub Actions workflow that runs on every push and pull request. It has these stages:
> 1. **Install dependencies** — `npm ci` (clean install, faster than `npm install`)
> 2. **Lint** — ESLint checks for code style violations
> 3. **Unit tests** — Jest runs all test files
> 4. **Coverage gate** — Jest checks that line coverage ≥ 70%, function coverage ≥ 65%, branch coverage ≥ 60%. If coverage drops below threshold, the pipeline fails.
> 5. **Security audit** — `npm audit` checks for known vulnerabilities in dependencies
>
> This ensures no code with broken tests or security issues gets merged.

---

### Q25. How did you write unit tests without a real database?

**Answer:**
> I use **Jest mocking**. In my unit tests, I mock the repository layer so the service never actually calls MySQL. For example, to test `InventoryService.updateStock()`, I mock `InventoryRepository.updateStockWithHistory` to return a fake `affectedRows` value. Then I test that:
> - If `affectedRows = 1` → service returns the updated record.
> - If `affectedRows = 0` AND versions match → service throws stock-negative error.
> - If `affectedRows = 0` AND versions differ → service throws `ConcurrentUpdateError`.
>
> This makes tests fast (no DB connection) and deterministic (no flaky network dependency).

---

## SECTION 7 — BEHAVIORAL / STAR QUESTIONS

---

### Q26. Tell me about a challenging technical problem you solved.

**STAR Answer:**
> **Situation:** I was building the inventory stock adjustment endpoint. Multiple warehouse workers can update the same SKU simultaneously — for example during a large order fulfillment.
>
> **Task:** I needed to prevent lost updates where one worker's change silently overwrites another's.
>
> **Action:** I researched pessimistic vs optimistic locking. Pessimistic locking would serialize all writes and kill performance. I chose Optimistic Concurrency Control — adding a `version` column to the inventory table. Every GET response includes the current version. Every PATCH must include that version. I wrote a single atomic SQL `UPDATE WHERE version = :version` that either succeeds or returns `affectedRows = 0`. If zero, I diagnose whether it was a version conflict, a missing record, or a negative-stock attempt, and return the appropriate 409 error.
>
> **Result:** The system handles concurrent stock updates correctly without any locking overhead. I also wrote unit tests that simulate the conflict scenario to prove it works.

---

### Q27. Why did you build this specific project?

**Answer:**
> I wanted to build something that solved a real business problem rather than another todo app. Inventory management directly impacts revenue — a stockout during peak demand loses sales, overstock wastes capital. Adding AI trend analysis made it genuinely predictive rather than just reactive. It also let me practice architecting a multi-role enterprise system from scratch, which taught me how real production software is structured.

---

### Q28. What would you improve if you had more time?

**Answer (pick 2-3):**
> 1. **Real-time WebSockets** — instead of polling for stock alerts, push notifications to the Manager dashboard the moment a product hits the reorder point.
> 2. **Redis caching** — cache the AI trend signals so re-analyzing the same keyword within an hour returns cached results rather than calling Gemini again (saves API cost and latency).
> 3. **Docker + Docker Compose** — containerize the backend and frontend so setup is a single `docker-compose up` command instead of manually setting up MySQL and Node.
> 4. **Retry with exponential backoff** — if Gemini API fails, retry up to 3 times with increasing delays before returning a 502.

---

### Q29. How would you scale this to 10 million inventory records?

**Answer:**
> A few key changes:
> 1. **Database indexing audit** — ensure all query patterns have covering indexes. Add a composite index on `(product_id, warehouse_location)` for multi-location queries.
> 2. **Read replicas** — route all GET requests to read replicas, only writes go to the primary MySQL instance.
> 3. **Redis caching** — cache the frequently-read product catalog and trend signals with a TTL, so most reads don't hit MySQL at all.
> 4. **Queue the AI calls** — instead of synchronous Gemini API calls, push `analyzeKeyword` jobs to a queue (BullMQ + Redis). Process them asynchronously, store results, then push to frontend via WebSocket.
> 5. **Pagination** — already implemented (`?page=&limit=`, max 100 per request). No one should be fetching 10M records at once.

---

## SECTION 8 — QUICK FIRE CONCEPTS

| Question | Answer |
|---|---|
| What is REST? | Stateless client-server architecture using HTTP verbs (GET, POST, PUT, PATCH, DELETE) and resource-based URLs |
| What is JWT? | JSON Web Token — a signed, base64-encoded token containing user claims. Stateless auth — no server-side sessions |
| What is bcrypt? | A password hashing algorithm with a configurable cost factor. Designed to be slow (to resist brute-force attacks) |
| What does Helmet do? | Sets secure HTTP headers to protect against XSS, clickjacking, MIME sniffing attacks |
| What is rate limiting? | Restricting how many requests an IP can make in a time window — prevents brute-force and DoS attacks |
| What is a foreign key? | A column that references the primary key of another table — enforces referential integrity |
| What is an ENUM column? | A column that only accepts predefined values — e.g., `status ENUM('PENDING','APPROVED','CANCELLED')` |
| What is Sequelize? | Node.js ORM — maps JavaScript objects to SQL tables, handles migrations and associations |
| What is `paranoid: true` in Sequelize? | Enables soft deletes — `destroy()` sets `deletedAt` instead of actually deleting the row |
| What is a database transaction? | A group of SQL statements that execute atomically — either ALL succeed or ALL roll back |
| What is RxJS? | Reactive Extensions for JavaScript — library for composing asynchronous streams using Observables |
| What is an Angular guard? | A service that implements `canActivate` — runs before a route loads to decide if navigation is allowed |
| What is lazy loading in Angular? | Loading feature modules only when the user navigates to that route — reduces initial bundle size |

---

## 📋 CHECKLIST BEFORE THE INTERVIEW

- [ ] Can you draw the architecture diagram from memory?
- [ ] Can you explain OCC without looking at notes?
- [ ] Can you recite the 4-step Gemini AI pipeline?
- [ ] Can you explain the difference between 401 vs 403?
- [ ] Can you name all 4 roles and which routes they can access?
- [ ] Can you explain why raw SQL was used over ORM for stock updates?
- [ ] Can you give the 30-second project pitch fluently?
- [ ] Have you opened the live URL and can demo it live in the interview?

---

*File location: `docs/INTERVIEW-PREP.md`*  
*Last updated: May 2026*
