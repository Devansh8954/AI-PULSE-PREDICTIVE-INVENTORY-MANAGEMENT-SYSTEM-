# AI-Pulse — Complete Codebase Guide
## PART 2: Frontend + Shared Patterns + Interview Q&A

---

## 15. Frontend Folder Structure

```
frontend/src/app/
├── app.module.ts            ← Registers ALL components, pipes, modules
├── app-routing.module.ts    ← URL → Component mapping + guards
├── app.component.ts         ← Root component (just a router-outlet wrapper)
│
├── core/                    ← Singleton services, guards, interceptors
│   ├── guards/
│   │   ├── auth.guard.ts    ← Blocks unauthenticated users
│   │   └── role.guard.ts    ← Blocks wrong-role users
│   ├── interceptors/
│   │   └── auth.interceptor.ts  ← Adds JWT to every HTTP request
│   └── services/
│       ├── auth.service.ts      ← Login, logout, token storage
│       ├── inventory.service.ts ← Inventory + PO API calls
│       ├── forecast.service.ts  ← Forecast API calls
│       └── trend.service.ts     ← Trend analysis API calls
│
├── features/                ← One folder per role dashboard
│   ├── login/               ← Login page
│   ├── dashboard/           ← Admin Command Center
│   ├── manager-dashboard/   ← Purchase orders + stock alerts
│   ├── analyst-dashboard/   ← Forecast charts + CSV export
│   └── warehouse-dashboard/ ← Bin inventory + PO dispatch/receive
│
└── shared/                  ← Reusable pieces used by multiple features
    ├── components/
    │   ├── shell/           ← Page layout wrapper (sidebar + router-outlet + mobile nav)
    │   ├── sidebar/         ← Left navigation panel
    │   └── loading-row/     ← Reusable spinner + text row
    ├── pipes/
    │   └── status.pipes.ts  ← statusClass pipe + statusIcon pipe
    └── styles/
        └── dashboard-shared.scss ← CSS used by all 4 dashboards
```

---

## 16. Angular Routing — How URLs Map to Components

File: `app-routing.module.ts`

```
/login         → LoginComponent           (public, no guard)
/              → ShellComponent           (AuthGuard required)
  /dashboard   → DashboardComponent       (RoleGuard: ADMIN only)
  /manager     → ManagerDashboardComponent (RoleGuard: MANAGER, ADMIN)
  /analyst     → AnalystDashboardComponent (RoleGuard: VIEWER, MANAGER, ADMIN)
  /warehouse   → WarehouseDashboardComponent (RoleGuard: WAREHOUSE, MANAGER, ADMIN)
/**            → redirect to /login       (catch-all)
```

**Why ShellComponent wraps the protected routes?**
Shell provides the sidebar and mobile nav. By nesting all protected routes inside Shell, every authenticated page automatically gets the sidebar — without repeating it in each component.

---

## 17. Role-Based Access Control (RBAC) — Frontend

Defined in `auth.service.ts`:

```typescript
export const ROLE_ACCESS: Record<UserRole, string[]> = {
  ADMIN:     ['/dashboard', '/manager', '/analyst', '/warehouse'],
  MANAGER:   ['/manager', '/analyst', '/warehouse'],
  VIEWER:    ['/analyst'],        // VIEWER = Analyst role in the DB
  WAREHOUSE: ['/warehouse'],
};

export const ROLE_HOME: Record<UserRole, string> = {
  ADMIN:     '/dashboard',
  MANAGER:   '/manager',
  VIEWER:    '/analyst',
  WAREHOUSE: '/warehouse',
};
```

**How it works end-to-end:**

1. User logs in → receives JWT with `role` in payload.
2. `AuthService` stores `{ token, user }` in `localStorage`.
3. When navigating to `/dashboard`:
   - `AuthGuard` checks: is there a token? No → redirect `/login`.
   - `RoleGuard` checks: does user's role include `/dashboard` in `ROLE_ACCESS`? No → redirect to `homeRoute`.
4. Sidebar filters nav items using `ROLE_ACCESS` — users only see dashboards they can access.
5. Mobile bottom nav also filtered the same way.

---

## 18. AuthService — State Management

`AuthService` uses a `BehaviorSubject` to hold the current user:

```typescript
private readonly _user$ = new BehaviorSubject<AuthUser | null>(this.loadUser());
readonly user$ = this._user$.asObservable();
```

- `BehaviorSubject` emits the **current value immediately** to any new subscriber.
- `loadUser()` reads from `localStorage` on app startup — so session persists across page refreshes.
- `login()` stores token + user, emits new value to all subscribers (sidebar, shell, guards all react).
- `logout()` clears localStorage, emits `null`, navigates to `/login`.

---

## 19. AuthInterceptor — Automatic JWT Injection

File: `core/interceptors/auth.interceptor.ts`

Every HTTP request automatically gets the JWT header:

```
Before:  GET /api/v1/inventory
After:   GET /api/v1/inventory
         Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Also handles 401 globally:
- If any API call returns 401 → clears localStorage → navigates to `/login`.
- This means if the token expires mid-session, the user is automatically logged out.

---

## 20. HTTP Services Pattern

Each service follows the same pattern:

```typescript
// inventory.service.ts example
getVendors(): Observable<any[]> {
  return this.http.get<any>(`${this.base}/vendors`).pipe(
    map(res => res.data ?? [])    // unwrap the { success, data } envelope
  );
}
```

**`InventoryService` also uses BehaviorSubjects for shared state:**

```typescript
private readonly _alerts$ = new BehaviorSubject<InventoryRecord[]>([]);
readonly alerts$ = this._alerts$.asObservable();
```

Why? The Manager dashboard subscribes to `alerts$`. When `loadLowStockAlerts()` is called, it updates the BehaviorSubject, and the template re-renders automatically. Multiple components can subscribe without each triggering their own HTTP call.

---

## 21. Shell Component — The Layout Wrapper

`ShellComponent` is the parent of all authenticated pages.

```html
<div class="app-shell">
  <app-sidebar [collapsed]="sidebarCollapsed" (toggleCollapse)="toggleSidebar()">
  </app-sidebar>

  <main class="app-shell__content">
    <router-outlet></router-outlet>  ← dashboard loads here
  </main>

  <nav class="mobile-nav">          ← visible only on mobile (≤600px)
    <a *ngFor="let item of mobileNavItems" ...>
  </nav>
</div>
```

`mobileNavItems` is filtered by role — same as the sidebar. So an ANALYST only sees the Analyst tab in the mobile nav.

---

## 22. Sidebar Component

- Receives `[collapsed]` input from Shell.
- Emits `(toggleCollapse)` event when the collapse button is clicked.
- Filters `ALL_NAV_ITEMS` using `ROLE_ACCESS` — user sees only accessible dashboards.
- Shows user name, email, and a colored role badge.
- Responsive: full text when expanded, icon-only when collapsed.

---

## 23. Admin Dashboard (DashboardComponent)

**What it does:** Central command for ADMIN role.

**Data flow:**
1. On load → `TrendService.getSignals()` → populates the live signals table.
2. User types a keyword and clicks "Analyze with AI".
3. → `TrendService.runAnalysis(keyword)` → `POST /api/v1/trends/analyze`.
4. On response → refreshes signals table + shows summary chips.
5. Bar chart shows Top 5 products: current stock vs predicted demand.

**Key features:**
- Signal type filter pills (ALL, DEMAND_SPIKE, SEASONAL, etc.)
- Text search on product name/SKU
- Export visible rows to CSV
- Chart built with Chart.js

**Loading state:** Uses `isLoading$` Observable (BehaviorSubject in TrendService).

---

## 24. Analyst Dashboard (AnalystDashboardComponent)

**What it does:** Read-only demand forecasting view for ANALYST role.

**Data flow:**
1. On load → `ForecastService.getProducts()` → gets all products.
2. For each product → `ForecastService.getForecast(productId)` — runs in parallel using `forkJoin`.
3. Maps results to `ForecastRow[]` — combining product + forecast data.
4. Populates two Chart.js charts:
   - **Bar chart:** Top 8 products — current stock vs predicted demand (30d).
   - **Doughnut chart:** Demand split by product category.

**Chart timing fix:** Charts are built in `ngAfterViewInit` (after DOM is ready). Data may arrive before or after. The component handles both cases using a `chartsBuilt` flag and a 150ms delay.

**Filter pills:** Filter forecast table by alert level (CRITICAL / MODERATE / LOW).

**CSV Export:** Exports the currently filtered rows — not all rows.

---

## 25. Manager Dashboard (ManagerDashboardComponent)

**What it does:** Inventory control and purchase order management.

**Stock Alerts Table:**
- Shows all items below reorder point.
- Status badge per item: CRITICAL (below safety stock) / LOW (below reorder) / OK.

**Purchase Order workflow:**
- Manager clicks "New PO" → modal form appears.
- Selects vendor, adds line items (product + qty + unit cost).
- On submit → `POST /api/v1/purchase-orders`.
- Table shows all POs. Manager can:
  - **Approve** PENDING → APPROVED (with confirm modal).
  - **Cancel** PENDING or APPROVED → CANCELLED.

**Optimistic update:** When status changes, `updatingPOId` is set to show a spinner on that row.

---

## 26. Warehouse Dashboard (WarehouseDashboardComponent)

**What it does:** Bin-level inventory view and inbound PO management.

**Bin Inventory Table:**
- Shows all inventory records with warehouse location and zone.
- Capacity bar (filled % = currentStock / reorderQuantity × 3).
- Action badge: RESTOCK (below reorder) / PICK (over 2× reorder) / IDLE.

**Inbound POs:**
- Filters purchase orders to only APPROVED and DISPATCHED.
- Warehouse can:
  - Mark APPROVED → DISPATCHED (goods left vendor).
  - Mark DISPATCHED → RECEIVED (goods arrived in warehouse).
- Both actions show a confirm modal with a status flow preview.

---

## 27. Shared Styles (dashboard-shared.scss)

All 4 dashboards import this one file. It defines:

| Class | Purpose |
|---|---|
| `.page` | Full-height flex column page wrapper |
| `.page-topbar` | Sticky top bar with gradient title text |
| `.role-badge` | Colored pill (gold/blue/purple/green) |
| `.stats-row` | 4-column responsive grid for stat cards |
| `.stat-card` | Card with icon + label + value (5 color variants) |
| `.panel` | Glass-effect content card |
| `.panel__header` | Panel title row |
| `.table-wrapper` | Scrollable table container |
| `.data-table` | Full-width Material table |
| `.sku-code` | Monospace blue pill for SKU codes |
| `.category-chip` | Purple pill for category labels |
| `.badge` | Status badge (red/gold/blue/green/muted) |
| `.count-badge` | Gray "X / Y items" label |
| `.loading-state` | Centered spinner for full-page loading |
| `.api-error-banner` | Red error strip at top of page |
| `.empty-state` | Centered icon + message when no data |
| `.fw-bold`, `.text-blue` etc. | Utility classes |

---

## 28. Shared Components & Pipes

### `LoadingRowComponent`
**Where:** `shared/components/loading-row/`
**What:** A spinner + text row inside a panel. Replaces the copy-pasted `<mat-spinner><span>` pattern.
**Usage:** `<app-loading-row message="Loading orders…"></app-loading-row>`

### `StatusIconPipe`
**Where:** `shared/pipes/status.pipes.ts`
**What:** Converts a status string to its Material icon name.
**Usage:** `{{ row.status | statusIcon }}` → `'thumb_up'` for `'APPROVED'`

### `StatusClassPipe`
**Where:** `shared/pipes/status.pipes.ts`
**What:** Converts a status string to its CSS badge class.
**Usage:** `[ngClass]="row.status | statusClass"` → `'badge--blue'` for `'APPROVED'`

**Why pipes instead of component methods?** Pipes are pure functions — Angular can cache their results and only recompute when the input changes. Component methods are called on every change detection cycle.

---

## 29. Memory Leak Prevention

Every component that subscribes to an Observable uses this pattern:

```typescript
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.someService.data$
    .pipe(takeUntil(this.destroy$))   // ← auto-unsubscribe
    .subscribe(data => ...);
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

Without `takeUntil`, subscriptions keep running even after the component is destroyed — causing memory leaks and ghost updates.

---

## 30. Angular Unit Testing (Karma + Jasmine)

Angular unit tests live alongside the source files as `.spec.ts` files.
All external dependencies (Router, HttpClient, AuthService) are replaced with Jasmine spy objects — no live server needed.

### Test Files

| Spec File | What It Tests | Key Assertions |
|---|---|---|
| `auth.guard.spec.ts` | `AuthGuard.canActivate()` | Logged-in → true; unauthenticated → false + navigate `/login` |
| `role.guard.spec.ts` | `RoleGuard.canActivate()` | Correct role → true; wrong role → false + redirect to homeRoute |
| `auth.service.spec.ts` | `AuthService` full | ROLE_ACCESS map, ROLE_HOME map, `canAccess()`, `isLoggedIn`, `login()`, `logout()`, `user$` observable |

### Key Patterns

```typescript
// All external dependencies are spy objects — no real HTTP or routing
const authSpy = jasmine.createSpyObj('AuthService', ['canAccess'], { isLoggedIn: false });
const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

// Spy on getter to control isLoggedIn value per test
(Object.getOwnPropertyDescriptor(authService, 'isLoggedIn')!.get as jasmine.Spy)
  .and.returnValue(true);

// HttpClientTestingModule intercepts HTTP calls for auth.service tests
const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
req.flush({ data: { token: 'jwt-token', user: mockUser } });
```

### Run in CI
```bash
npm run test:ci   # Headless Chrome, code coverage enabled
```

---

## 31. Chart.js Integration (Analyst Dashboard)

```typescript
// Charts are initialized ONCE in ngAfterViewInit
ngAfterViewInit(): void {
  setTimeout(() => {
    this.buildLineChart();   // creates empty Chart instance
    this.buildPieChart();
    this.chartsBuilt = true;
    if (this.forecastRows.length) {  // data may have arrived first
      this.updateLineChart();
      this.updatePieChart();
    }
  }, 150);  // 150ms delay ensures canvas is fully painted
}

// Data arrives → updateChart() pushes new data to existing instance
updateLineChart(): void {
  this.lineChart.data.labels = [...];
  this.lineChart.data.datasets[0].data = [...];
  this.lineChart.update();   // re-renders smoothly with animation
}

// IMPORTANT: Destroy charts on component destroy to prevent memory leaks
ngOnDestroy(): void {
  this.lineChart?.destroy();
  this.pieChart?.destroy();
}
```

---

## 31. Common Interview Questions & Answers

**Q: What is Optimistic Concurrency Control and why do you use it?**
A: OCC prevents data corruption when multiple users update the same record simultaneously. Each record has a `version` number. When you update, you must send the version you last read. The SQL WHERE clause checks `AND version = :version`. If another user already updated (version changed), affected rows = 0 → HTTP 409 Conflict. The client must re-fetch and retry. We use this instead of pessimistic locking (SELECT FOR UPDATE) because it's faster — no rows are locked, so reads are never blocked.

**Q: Why Angular guards and not just hiding nav items?**
A: Hiding a nav item doesn't prevent direct URL navigation. Guards intercept at the router level — if a WAREHOUSE user types `/dashboard` in the URL, RoleGuard redirects them to `/warehouse` before the component even loads.

**Q: What does BehaviorSubject do vs regular Subject?**
A: A regular Subject only emits to subscribers who were listening BEFORE the emit. A BehaviorSubject always emits the current value to any new subscriber immediately. This is why `AuthService` uses it — if a component subscribes after login, it still gets the current user.

**Q: Why use raw SQL for stock updates instead of Sequelize ORM?**
A: The ORM's read-modify-write pattern (fetch → change in JS → save) is a multi-step operation. Between the read and the save, another update can happen — data corruption. Raw SQL `SET quantity = quantity + delta` is a single atomic operation evaluated by MySQL itself, guaranteed safe.

**Q: What happens when GEMINI_API_KEY is missing?**
A: The server boots normally — the key is validated lazily (only when `analyzeKeyword()` is called). Missing key throws a 503 AppError with a clear message. All other dashboards and features work fine without it.

**Q: How does the JWT interceptor work?**
A: Angular's `HttpInterceptor` interface intercepts every `HttpClient` request. The `AuthInterceptor` clones each request and adds the `Authorization: Bearer <token>` header from localStorage before it's sent. It also globally catches 401 responses to force logout.

**Q: What is the signal pipeline?**
A: After Gemini AI returns trending products, we cross-reference each predicted SKU against our database. Products that are BOTH trending AND below stock threshold get a `trend_signal` row written (upserted — no duplicates per day). The forecast engine reads these signals and weights them by `signal_score × weight` to predict demand.

**Q: Why does the Analyst dashboard use forkJoin?**
A: The dashboard needs forecasts for ALL products. It can't make sequential API calls (too slow). `forkJoin` fires all forecast calls in parallel and waits for ALL to complete before rendering. If any individual forecast fails, `catchError(() => of(null))` prevents one failure from killing all the others.

---

## 32. How to Run the Project

```bash
# Step 1: Database
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql

# Step 2: Backend (Terminal 1)
cd backend
cp .env.example .env      # Set DB_PASSWORD at minimum
npm install
npm run dev               # Runs on http://localhost:3000

# Step 3: Frontend (Terminal 2)
cd frontend
npm install
ng serve                  # Runs on http://localhost:4200

# Step 4: Generate test JWT token (optional, for API testing)
cd backend
node src/scripts/generate-token.js ADMIN
```

---

## 33. File-by-File Quick Reference

| File | Layer | What It Does |
|---|---|---|
| `backend/src/server.js` | Entry | Starts HTTP server |
| `backend/src/app.js` | Bootstrap | Registers all middleware + routes |
| `backend/src/config/db.config.js` | Config | Sequelize connection pool |
| `backend/src/config/jwt.config.js` | Config | JWT secret + expiry |
| `backend/src/utils/auth.helpers.js` | Util | `signUserToken()`, `publicUser()` |
| `backend/src/utils/logger.js` | Util | Winston structured logger |
| `backend/src/middlewares/auth.middleware.js` | Middleware | JWT verify + role check |
| `backend/src/middlewares/errorHandler.middleware.js` | Middleware | Central error → HTTP response |
| `backend/src/middlewares/rateLimiter.middleware.js` | Middleware | DDoS / brute-force protection |
| `backend/src/middlewares/validate.middleware.js` | Middleware | Joi schema validation |
| `backend/src/routes/index.js` | Router | Mounts all sub-routers at `/api/v1` |
| `backend/src/controllers/auth.controller.js` | Controller | Register, Login, Me |
| `backend/src/controllers/inventory.controller.js` | Controller | List, Get, AdjustStock (OCC) |
| `backend/src/services/inventory.service.js` | Service | Business rules for stock updates |
| `backend/src/services/TrendAnalysisService.js` | Service | Gemini AI orchestration |
| `backend/src/repositories/inventory.repository.js` | Repository | Raw SQL for atomic stock updates |
| `frontend/src/app/app-routing.module.ts` | Routing | URL → component + guards |
| `frontend/src/app/app.module.ts` | Module | Declares all components + providers |
| `frontend/src/app/core/services/auth.service.ts` | Service | Login/logout + RBAC + state |
| `frontend/src/app/core/services/inventory.service.ts` | Service | HTTP calls for inventory + POs |
| `frontend/src/app/core/guards/auth.guard.ts` | Guard | Blocks unauthenticated users |
| `frontend/src/app/core/guards/auth.guard.spec.ts` | Test | AuthGuard unit tests |
| `frontend/src/app/core/guards/role.guard.ts` | Guard | Blocks wrong-role users |
| `frontend/src/app/core/guards/role.guard.spec.ts` | Test | RoleGuard unit tests |
| `frontend/src/app/core/interceptors/auth.interceptor.ts` | Interceptor | Injects JWT + handles 401 |
| `frontend/src/app/core/services/auth.service.ts` | Service | Login/logout + RBAC + state |
| `frontend/src/app/core/services/auth.service.spec.ts` | Test | AuthService unit tests |
| `frontend/src/app/shared/components/shell/` | Layout | Sidebar + router-outlet wrapper |
| `frontend/src/app/shared/components/sidebar/` | Layout | Role-filtered navigation panel |
| `frontend/src/app/shared/components/loading-row/` | Shared UI | Reusable spinner row |
| `frontend/src/app/shared/pipes/status.pipes.ts` | Shared Pipe | statusClass + statusIcon |
| `frontend/src/app/shared/styles/dashboard-shared.scss` | Styles | All shared CSS tokens |
| `frontend/src/app/features/dashboard/` | Feature | Admin dashboard (AI + signals) |
| `frontend/src/app/features/manager-dashboard/` | Feature | Stock alerts + PO management |
| `frontend/src/app/features/analyst-dashboard/` | Feature | Forecast charts + CSV export |
| `frontend/src/app/features/warehouse-dashboard/` | Feature | Bin inventory + PO dispatch |
| `database/schema.sql` | DB | All CREATE TABLE statements |
| `database/seed.sql` | DB | Sample data (products, vendors, inventory) |

---

## 34. Quick Troubleshooting

### Backend won't start

| Error | Cause | Fix |
|---|---|---|
| `DB_PASSWORD is not set` | `backend/.env` missing or empty | Create `.env` from `.env.example`, fill in password |
| `Access denied for user 'root'` | Wrong password in `.env` | Check `DB_PASSWORD` matches your MySQL password |
| `Cannot find module '...'` | `npm install` not run | Run `npm install` in `backend/` |
| `EADDRINUSE: port 3000` | Another process using port 3000 | Kill it: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F` |
| `Gemini API key missing` | `GEMINI_API_KEY` not set | Leave blank — AI features disabled, all else works |

### Frontend won't start

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module '@angular/core'` | `npm install` not run | Run `npm install` in `frontend/` |
| `Port 4200 already in use` | Another Angular instance | Kill it or use `ng serve --port 4201` |
| `401 Unauthorized` on all API calls | JWT token expired/missing | Log out and log back in |
| Material icons not showing | Font not loaded | Check `index.html` has the Google Fonts link |

### Tests fail locally

| Error | Cause | Fix |
|---|---|---|
| `DB_PASSWORD is not set` in tests | Not set in env before `npm test` | Run: `$env:DB_PASSWORD="anything"; npm test` |
| Coverage threshold not met | New code added without tests | Add tests or lower threshold in `package.json` |
| `jest.mock() not intercepting` | Module has top-level side effects | Use factory mock: `jest.mock('...', () => ({...}))` |

### Git / Security

| Situation | Command |
|---|---|
| Accidentally committed `.env` | `git rm --cached backend/.env && git commit -m "remove .env"` |
| Password in old commit | `pip install git-filter-repo` then `git filter-repo --replace-text secrets.txt --force` |
| Push rejected after filter-repo | `git remote add origin <url>` then `git push --force origin main` |

---

## 35. Glossary

| Term | Meaning |
|---|---|
| **OCC** | Optimistic Concurrency Control — version-based conflict detection without locking rows |
| **TOCTOU** | Time-of-check / Time-of-use — race condition between reading and updating shared data |
| **JWT** | JSON Web Token — self-contained auth token; backend verifies without a database call |
| **RBAC** | Role-Based Access Control — what a user can do depends on their role |
| **BehaviorSubject** | RxJS class that always emits the latest value to new subscribers |
| **SPA** | Single Page Application — Angular renders entirely in the browser |
| **Guard** | Angular class that can block a route from activating |
| **Interceptor** | Angular class that intercepts every HTTP request/response |
| **Pipe** | Angular class that transforms template values (pure — cached by change detection) |
| **Repository pattern** | Design pattern: isolate all database queries in one layer |
| **Layered architecture** | Controller → Service → Repository — each layer has one job |
| **Soft delete** | Mark a record as inactive instead of deleting it — keeps audit history |
| **Signal TTL** | Time-to-live — trend signals expire after N days; stale signals are ignored |
| **affectedRows** | MySQL response: how many rows the UPDATE actually changed |
| **forkJoin** | RxJS operator: run N observables in parallel, wait for all to complete |
