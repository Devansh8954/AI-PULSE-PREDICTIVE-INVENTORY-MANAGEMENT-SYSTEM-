# 🖥️ Frontend Architecture Guide

This document outlines the architecture, technology stack, and core design principles of the **AI-Pulse Frontend**.

## 🛠️ Technology Stack
- **Framework**: Angular 17 (TypeScript)
- **UI Library**: Angular Material & Custom SCSS
- **State/Reactivity**: RxJS (Observables, Subjects)
- **Data Visualization**: Chart.js
- **Routing**: HTML5 History API (Managed by Angular Router)

## 🏗️ Core Architecture

The frontend is built as a **Single Page Application (SPA)** with strict role-based access control.

### 1. Interceptors & Authentication
Every outgoing HTTP request to the backend is intercepted by the `JwtInterceptor`. It automatically attaches the `Bearer <token>` to the `Authorization` header. If the server responds with a `401 Unauthorized`, the interceptor automatically logs the user out and redirects them to the login screen.

### 2. Route Guards (Security)
Angular `CanActivate` route guards prevent unauthorized users from accessing specific dashboards:
- **`AuthGuard`**: Ensures the user is logged in.
- **`RoleGuard`**: Checks the JWT payload to ensure the user has the correct role (e.g., `ADMIN`, `MANAGER`) before rendering the route.

### 3. Role-Based Dashboards
The application dynamically routes users based on their role:
* **Admin Command Center**: AI trend analysis triggers, full signal tables, and CSV exports.
* **Manager Dashboard**: Purchase order (PO) approval workflows and stock alert reviews.
* **Analyst Studio**: 30-day demand forecast charts (Chart.js) and data filtering.
* **Warehouse Ops**: Bin location management and PO dispatch/receive workflows.

## 📦 Containerization (Docker Multi-Stage Build)

To keep the production image small and secure, the frontend uses a **Multi-Stage Docker Build**:
1. **Stage 1 (Builder)**: Uses `node:alpine`. Installs dependencies and runs `ng build --configuration production`. The `NODE_OPTIONS="--max-old-space-size=1536"` flag prevents the Angular esbuild compiler from crashing on low-memory servers like AWS EC2 `t2.micro`.
2. **Stage 2 (Runner)**: Uses `nginx:alpine`. It drops the heavy Node.js environment entirely, copies only the compiled static HTML/CSS/JS files from Stage 1, and serves them using Nginx. This reduces the final Docker image from ~600MB down to just ~30MB.
# AI-Pulse — Frontend Architecture Guide
## Complete Explanation From Basics

---

## 1. What Is the Frontend?

The **frontend** is everything the user sees in the browser. It is a **Single Page Application (SPA)** — meaning the browser loads ONE HTML file once, and Angular takes over, swapping content dynamically without full page reloads.

Our frontend is built with **Angular 17** (TypeScript framework). It talks to the backend over HTTP using Angular's `HttpClient`.

---

## 2. What Is Angular?

**Angular** is a JavaScript framework made by Google for building web applications. Key concepts:

| Concept | Plain English |
|---|---|
| **Component** | A reusable UI block — has HTML template + TypeScript logic + CSS styles |
| **Module** | A container that groups related components, services, and pipes |
| **Service** | A shared class for logic and data — injected into components |
| **Guard** | A class that can block navigation to a route |
| **Interceptor** | A class that intercepts every HTTP request/response |
| **Pipe** | A function that transforms a value in a template (`{{ date \| date:'short' }}`) |
| **Observable** | A stream of values over time — Angular uses RxJS for this |
| **Directive** | Instructions that extend HTML (`*ngIf`, `*ngFor`, `[class.active]`) |

---

## 3. Tech Stack Used in the Frontend

| Tool | What It Is | Why |
|---|---|---|
| **Angular 17** | Component-based SPA framework | Reactive, strongly typed, great for complex dashboards |
| **TypeScript** | JavaScript with types | Catches bugs at compile time, not runtime |
| **Angular Material** | Google's UI component library | Pre-built table, form field, button, tooltip components |
| **RxJS** | Reactive programming library | Handles async data streams (HTTP calls, real-time updates) |
| **Chart.js** | Canvas-based charting library | Powers the bar chart and doughnut chart in dashboards |
| **SCSS** | Enhanced CSS with variables, nesting | Makes CSS maintainable and DRY |

---

## 4. Folder Structure — Every File and Folder Explained

```
frontend/src/app/
│
├── app.module.ts          ← Registers EVERY component, service, module used in the app
├── app-routing.module.ts  ← Maps URLs (/dashboard, /login) to components
├── app.component.ts       ← Root component — just wraps <router-outlet>
│
├── core/                  ← Singleton services (loaded once, shared everywhere)
│   ├── guards/
│   │   ├── auth.guard.ts       ← Blocks unauthenticated users from protected pages
│   │   └── role.guard.ts       ← Blocks users with wrong roles from pages
│   ├── interceptors/
│   │   └── auth.interceptor.ts ← Adds JWT token to EVERY HTTP request automatically
│   └── services/
│       ├── auth.service.ts     ← Login, logout, token storage, user state
│       ├── trend.service.ts    ← API calls for AI analysis + trend signals
│       ├── inventory.service.ts← API calls for stock, purchase orders
│       └── forecast.service.ts ← API calls for demand forecasts
│
├── features/              ← One folder per dashboard/page
│   ├── login/             ← Login page component
│   ├── dashboard/         ← Admin dashboard (AI search + signals table)
│   ├── manager-dashboard/ ← Manager: stock alerts + purchase orders
│   ├── analyst-dashboard/ ← Analyst: forecast charts + CSV export
│   └── warehouse-dashboard/ ← Warehouse: bin inventory + PO dispatch
│
└── shared/                ← Reusable pieces used across multiple features
    ├── components/
    │   ├── shell/         ← Page layout wrapper (sidebar + main content area)
    │   ├── sidebar/       ← Left navigation menu
    │   └── loading-row/   ← Reusable spinner component
    ├── models/
    │   └── trend.model.ts ← TypeScript interfaces for API data shapes
    ├── pipes/
    │   └── status.pipes.ts← Converts status strings to CSS classes or icons
    └── styles/
        └── dashboard-shared.scss ← CSS shared by all 4 dashboards
```

---

## 5. How Angular Routing Works

**Routing** maps a browser URL to an Angular component. Defined in `app-routing.module.ts`.

```
URL Typed in Browser        Component That Renders
──────────────────────      ──────────────────────
/login               →      LoginComponent (public)
/                    →      ShellComponent (needs auth)
  /dashboard         →        DashboardComponent (ADMIN only)
  /manager           →        ManagerDashboardComponent (MANAGER, ADMIN)
  /analyst           →        AnalystDashboardComponent (VIEWER, MANAGER, ADMIN)
  /warehouse         →        WarehouseDashboardComponent (WAREHOUSE, MANAGER, ADMIN)
anything else        →      redirect to /login
```

**Why is `ShellComponent` the parent?**  
All protected pages need a sidebar and mobile nav. Instead of putting that HTML in every dashboard, `ShellComponent` wraps them all. Its template has `<router-outlet>` where child routes load.

```html
<!-- Shell wraps everything -->
<div class="app-shell">
  <app-sidebar></app-sidebar>
  <main>
    <router-outlet></router-outlet>  ← dashboard loads here
  </main>
</div>
```

---

## 6. Route Guards — Protecting Pages

### `AuthGuard` — Are You Logged In?

When you navigate to `/dashboard`, `AuthGuard` runs first:
```
Is there a token in localStorage?
  YES → allow navigation to the component
  NO  → redirect to /login
```

Without guards, anyone could type `http://localhost:4200/dashboard` in the URL bar and see the admin page. The guard prevents this.

### `RoleGuard` — Are You the Right Role?

Even if logged in, not every user can see every page:
```
ADMIN    can see: /dashboard, /manager, /analyst, /warehouse
MANAGER  can see: /manager, /analyst, /warehouse
VIEWER   can see: /analyst only
WAREHOUSE can see: /warehouse only
```

If a WAREHOUSE user types `/dashboard` in the URL bar, `RoleGuard` redirects them to `/warehouse` (their home route).

---

## 7. AuthService — Managing Login State

`AuthService` manages who is currently logged in. It uses a **BehaviorSubject** to hold the current user.

### What is a BehaviorSubject?

A **BehaviorSubject** is an RxJS class that:
- Holds the **current value** in memory
- Emits that value immediately to any new subscriber
- Emits a new value to ALL subscribers when updated

```typescript
// In AuthService:
private readonly _user$ = new BehaviorSubject<AuthUser | null>(this.loadUser());
readonly user$ = this._user$.asObservable(); // exposed as read-only

// When user logs in:
this._user$.next(loggedInUser); // ALL subscribers react automatically

// Sidebar subscribes and re-renders:
this.authService.user$.subscribe(user => {
  this.currentUser = user; // sidebar shows new name/role
});
```

**vs Regular Subject:** A regular Subject only emits to subscribers who were listening BEFORE the value was set. BehaviorSubject always gives the latest value to any new subscriber — perfect for "current logged-in user" state.

### Full Login Flow

```
1. User submits form → loginComponent calls authService.login(email, password)
2. AuthService sends: POST /api/v1/auth/login
3. Response: { token: "eyJ...", user: { id, name, email, role } }
4. AuthService stores in localStorage:
     localStorage.setItem('ai_pulse_token', token)
     localStorage.setItem('ai_pulse_user', JSON.stringify(user))
5. _user$.next(user) → all subscribers (sidebar, guards) react
6. Router navigates to ROLE_HOME[user.role] (/dashboard for ADMIN)
```

**Why localStorage?**  
Survives page refresh. If you store in memory only, refreshing the page logs you out.
 
### Logout Flow

```
authService.logout()
  1. localStorage.removeItem('ai_pulse_token')
  2. localStorage.removeItem('ai_pulse_user')
  3. _user$.next(null) → all subscribers show "no user"
  4. router.navigate(['/login'])
```

---

## 8. AuthInterceptor — Automatic JWT Injection

Every HTTP request needs a JWT token header. Without an interceptor, you'd add it manually in every service method. With an interceptor, it happens automatically.

```typescript
// How it works:
intercept(req: HttpRequest<unknown>, next: HttpHandler) {
  const token = localStorage.getItem('ai_pulse_token');

  // Clone the request (requests are immutable) and add the header
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next.handle(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        // Token expired mid-session → auto logout
        localStorage.clear();
        this.router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
}
```

**Before interceptor:**
```
GET /api/v1/inventory
(no auth header → 401 error)
```

**After interceptor:**
```
GET /api/v1/inventory
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
(automatically added to EVERY request)
```

---

## 9. TrendService — The Admin Dashboard Service

`TrendService` manages all data for the Admin dashboard. It uses BehaviorSubjects as reactive state stores.

```typescript
// State stored in the service (not in the component):
private readonly _signals$   = new BehaviorSubject<DashboardRow[]>([]);
private readonly _isLoading$ = new BehaviorSubject<boolean>(false);

// Components subscribe to these:
readonly signals$   = this._signals$.asObservable();
readonly isLoading$ = this._isLoading$.asObservable();
```

**Why store state in the service instead of the component?**  
If multiple components need the same data, they all subscribe to the service's observables. Only ONE HTTP call is made. When the data updates, all components update simultaneously.

### `loadSignals()` — Fetching Trend Data

```typescript
loadSignals(): void {
  this._isLoading$.next(true);  // show spinner

  this.http.get<ApiResponse<TrendSignal[]>>(`${baseUrl}/trends/signals`)
    .pipe(
      map(res => this.transformToDashboardRows(res.data)), // transform raw API data
      tap(rows => this._signals$.next(rows)),              // push to BehaviorSubject
      finalize(() => this._isLoading$.next(false))         // hide spinner always
    )
    .subscribe();
}
```

### `analyzeKeyword()` — Triggering AI Analysis

```typescript
analyzeKeyword(keyword: string): Observable<AnalyzeReport> {
  this._isLoading$.next(true);

  return this.http.post<ApiResponse<AnalyzeReport>>(`${baseUrl}/trends/analyze`, { keyword })
    .pipe(
      map(res => res.data),
      tap(() => this.loadSignals()), // auto-refresh table after analysis
      finalize(() => this._isLoading$.next(false))
    );
}
```

### Data Transformation

The backend returns raw `TrendSignal[]` objects. The service transforms these into `DashboardRow[]` (what the template actually displays):

```typescript
// Raw API signal:
{ signalScore: 0.88, product: { sku: 'ELEC-001' }, rawPayload: { totalOnHand: 30 } }

// Transformed DashboardRow:
{
  sku: 'ELEC-001',
  trendScore: 88,          // 0.88 × 100 = 88%
  currentStock: 30,
  predictedDemand: 83,     // 30 × (1 + 0.88 × 1.8)
  isAlert: true            // trendScore > 70 AND stock < 50
}
```

---

## 10. Admin Dashboard Component

**File:** `features/dashboard/dashboard.component.ts`

**What the Admin sees:**
1. Stats row: Total Signals, Alerts, Adequate Stock, Avg Trend Score
2. AI Trend Analysis panel: keyword input + "Analyze with AI" button
3. Live Trend Signals table with filter pills and text search
4. Bar chart: Top 5 products — Current Stock vs Predicted Demand

### Angular Material Table with Filtering

```typescript
dataSource = new MatTableDataSource<DashboardRow>([]);

// Custom filter combines text search + signal type pill:
this.dataSource.filterPredicate = (row, filter) => {
  const [textFilter, typeFilter] = filter.split('|');
  
  const textMatch = !textFilter ||
    [row.sku, row.productName, row.category, row.reason]
      .join(' ').toLowerCase().includes(textFilter);
  
  const typeMatch = !typeFilter || row.signalType === typeFilter;
  
  return textMatch && typeMatch;
};

// Applying the combined filter:
applyFilter(): void {
  const text = this.filterControl.value.trim().toLowerCase();
  this.dataSource.filter = `${text}|${this.activeTypeFilter}`;
}
```

### Chart.js Bar Chart

```typescript
// Initialized ONCE in ngAfterViewInit (after canvas exists in DOM):
ngAfterViewInit(): void {
  this.initChart(); // creates empty Chart instance on the canvas
}

// Updated EVERY TIME new data arrives:
private updateChart(rows: DashboardRow[]): void {
  const top5 = this.trendService.getTopNByTrendScore(rows, 5);
  
  this.barChart.data.labels = top5.map(r => r.productName);
  this.barChart.data.datasets[0].data = top5.map(r => r.currentStock);
  this.barChart.data.datasets[1].data = top5.map(r => r.predictedDemand);
  this.barChart.update(); // re-renders with animation
}
```

---

## 11. Analyst Dashboard

**Who sees it:** VIEWER (Analyst) role  
**What it shows:** Demand forecasts with charts

### Data Loading with `forkJoin`

The dashboard needs forecasts for ALL products simultaneously:

```typescript
// forkJoin = fire all HTTP calls in parallel, wait for ALL to complete
this.forecastService.getProducts().pipe(
  switchMap(products =>
    forkJoin(
      products.map(p =>
        this.forecastService.getForecast(p.id).pipe(
          catchError(() => of(null)) // if one forecast fails, don't kill all others
        )
      )
    )
  )
).subscribe(forecasts => {
  this.forecastRows = this.buildRows(products, forecasts);
});
```

**Why not sequential calls?**  
If there are 20 products and each call takes 200ms, sequential would take 4 seconds. `forkJoin` runs all 20 in parallel — takes only ~200ms.

### Charts

- **Bar chart:** Top 8 products — current stock vs 30-day predicted demand
- **Doughnut chart:** Demand broken down by product category

Charts are built in `ngAfterViewInit` with a 150ms delay:
```typescript
ngAfterViewInit(): void {
  setTimeout(() => {
    this.buildBarChart();
    this.buildDoughnutChart();
    this.chartsBuilt = true;
    // Data may have arrived before charts were ready:
    if (this.forecastRows.length) {
      this.updateBarChart();
      this.updateDoughnutChart();
    }
  }, 150); // ensures canvas is painted before Chart.js tries to use it
}
```

---

## 12. Manager Dashboard

**Who sees it:** MANAGER, ADMIN  
**What it does:** View low-stock alerts + manage purchase orders

### Stock Alert Classification
```
CRITICAL → item is below safety stock level (danger zone)
LOW      → item is below reorder point (time to order soon)
OK       → stock is adequate
```

### Purchase Order Form
Manager clicks "New PO" → modal form appears:
1. Select vendor from dropdown
2. Add line items (product + quantity + unit cost)
3. System calculates total automatically
4. On submit → `POST /api/v1/purchase-orders`

Manager can then **Approve** or **Cancel** pending POs. Each action shows a confirm modal before executing.

---

## 13. Warehouse Dashboard

**Who sees it:** WAREHOUSE, MANAGER, ADMIN  
**What it does:** Bin-level inventory + inbound PO management

### Bin Inventory
Each row shows:
- Warehouse location (e.g., "Zone A, Bin 12")
- Current stock with a visual capacity bar
- Action badge: RESTOCK / PICK / IDLE based on stock vs reorder point

### PO Status Updates
Warehouse can:
- Mark `APPROVED → DISPATCHED` (goods left the vendor)
- Mark `DISPATCHED → RECEIVED` (goods arrived in warehouse)

Both show a confirm modal with a visual status flow preview.

---

## 14. Shell and Sidebar Components

### ShellComponent

The layout wrapper for ALL authenticated pages:

```html
<div class="app-shell">
  <app-sidebar 
    [collapsed]="sidebarCollapsed" 
    (toggleCollapse)="toggleSidebar()">
  </app-sidebar>

  <main class="app-shell__content">
    <router-outlet></router-outlet>  <!-- dashboard loads here -->
  </main>

  <nav class="mobile-nav">  <!-- visible only on phones -->
    <a *ngFor="let item of mobileNavItems" [routerLink]="item.path">
      <mat-icon>{{ item.icon }}</mat-icon>
      {{ item.label }}
    </a>
  </nav>
</div>
```

### SidebarComponent

- Receives `[collapsed]` input → shows icon-only when collapsed, full text when expanded
- Emits `(toggleCollapse)` event when collapse button clicked
- Filters navigation items by role — a WAREHOUSE user only sees the Warehouse link
- Shows current user's name, email, and role badge

**Role filtering:**
```typescript
// ALL_NAV_ITEMS contains every possible nav link
// ROLE_ACCESS[role] = array of allowed paths for that role
this.navItems = ALL_NAV_ITEMS.filter(item =>
  ROLE_ACCESS[this.currentUser.role].includes(item.path)
);
```

---

## 15. Shared Styles (dashboard-shared.scss)

All 4 dashboards import this ONE file. It defines the design system:

| CSS Class | What It Does |
|---|---|
| `.page` | Full-height flex column wrapper for a dashboard page |
| `.page-topbar` | Sticky top bar with gradient brand text |
| `.role-badge` | Colored pill label showing the user's role (gold=ADMIN, blue=MANAGER, etc.) |
| `.stats-row` | 4-column responsive grid for the stat cards |
| `.stat-card` | Card with icon + label + number (5 color variants: blue/gold/green/purple/red) |
| `.panel` | Glass-effect content card with dark background |
| `.panel__header` | Title row inside a panel |
| `.table-wrapper` | Scrollable container for the data table |
| `.data-table` | Full-width Angular Material table |
| `.sku-code` | Monospace blue pill for SKU codes (e.g., `ELEC-001`) |
| `.category-chip` | Purple pill for category labels |
| `.badge` | Status badge: alert=red, ok=green, pending=gold, etc. |
| `.loading-state` | Centered spinner for page-level loading |
| `.empty-state` | Centered icon + message when table has no data |
| `.api-error-banner` | Red stripe at top showing API errors |

---

## 16. Shared Pipes

**Pipes** transform values inside Angular templates without changing the component code.

### `StatusClassPipe`
Converts a status string to a CSS class:
```
'APPROVED'   → 'badge--blue'
'PENDING'    → 'badge--gold'
'CANCELLED'  → 'badge--red'
'RECEIVED'   → 'badge--green'
```

Usage in template:
```html
<span [ngClass]="row.status | statusClass">{{ row.status }}</span>
```

### `StatusIconPipe`
Converts a status string to a Material icon name:
```
'APPROVED'   → 'thumb_up'
'PENDING'    → 'schedule'
'CANCELLED'  → 'cancel'
'RECEIVED'   → 'inventory'
```

**Why pipes instead of component methods?**  
Pipes are **pure functions** — Angular caches their results. A component method is called on EVERY change detection cycle (can be hundreds of times per second). A pipe only recalculates when its input changes.

---

## 17. Memory Leak Prevention

A **memory leak** happens when code keeps running after the component it belongs to has been destroyed.

**Problem:** When a component subscribes to an Observable and the user navigates away, the component is destroyed — but the subscription keeps firing, trying to update a destroyed component.

**Solution — `takeUntil` + `destroy$` pattern:**

```typescript
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.trendService.signals$
      .pipe(takeUntil(this.destroy$))  // auto-unsubscribe when destroy$ emits
      .subscribe(rows => {
        this.dataSource.data = rows;  // safe — component still alive
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();     // signal all subscriptions to stop
    this.destroy$.complete(); // clean up the Subject itself
    this.barChart?.destroy(); // also destroy Chart.js instance
  }
}
```

Every component in this project follows this pattern. Without it, navigating between dashboards would cause ghost updates and memory leaks.

---

## 18. Angular Lifecycle Hooks

Angular components have lifecycle events you can hook into:

| Hook | When It Runs | Used For |
|---|---|---|
| `ngOnInit()` | After component is created | Start HTTP calls, set up subscriptions |
| `ngAfterViewInit()` | After HTML is rendered | Access DOM elements (like canvas for Chart.js) |
| `ngOnDestroy()` | Before component is removed | Cancel subscriptions, destroy charts |

**Example — Why Chart.js needs `ngAfterViewInit`:**
```typescript
@ViewChild('barChartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

ngOnInit(): void {
  // ❌ WRONG: canvasRef is undefined here — HTML not rendered yet
  const ctx = this.canvasRef.nativeElement.getContext('2d'); // null!
}

ngAfterViewInit(): void {
  // ✅ CORRECT: HTML is rendered, canvas element exists
  const ctx = this.canvasRef.nativeElement.getContext('2d');
  this.barChart = new Chart(ctx, config);
}
```

---

## 19. RxJS Operators Used in This App

| Operator | What It Does | Where We Use It |
|---|---|---|
| `map` | Transforms each emitted value | `map(res => res.data)` — unwrap API envelope |
| `tap` | Side effect without changing the value | `tap(() => this.loadSignals())` — refresh after analyze |
| `catchError` | Handles errors in the stream | Show snackbar error, don't crash the stream |
| `finalize` | Runs when observable completes OR errors | `finalize(() => isLoading$.next(false))` — always hide spinner |
| `takeUntil` | Stop subscribing when another observable emits | Memory leak prevention |
| `debounceTime` | Wait N ms after last event before emitting | Search box: don't filter on every keystroke |
| `distinctUntilChanged` | Skip if value didn't change | Don't re-filter if user types then deletes same character |
| `switchMap` | Cancel previous inner observable when new one starts | Used in forecast loading |
| `forkJoin` | Wait for ALL observables to complete | Load all product forecasts in parallel |
| `combineLatest` | Emit when ANY source emits, with all latest values | Combine multiple filters |

---

## 20. How to Run the Frontend

```bash
# 1. Enter the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
ng serve --proxy-config proxy.conf.json
# Runs on http://localhost:4200
# The proxy config forwards /api calls to http://localhost:3000
```

The app will open at `http://localhost:4200`. Log in with any seeded user account.

**Default credentials (from database seed):**
```
Admin:    admin@aipulse.com    / Admin@123!
Manager:  manager@aipulse.com  / Manager@123!
Analyst:  analyst@aipulse.com  / Analyst@123!
Warehouse: warehouse@aipulse.com / Warehouse@123!
```

---

## 21. What `proxy.conf.json` Does

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

Without this, the browser would block API calls because the frontend (port 4200) and backend (port 3000) are on different ports — violating the **Same-Origin Policy**.

The Angular dev server proxies all `/api/*` requests to the backend. In production, a real web server (Nginx) or cloud load balancer does the same thing.

---

## 22. TypeScript Interfaces (Models)

File: `shared/models/trend.model.ts`

TypeScript interfaces define the **shape** of data — like a contract between the frontend and backend.

```typescript
// What the API returns:
export interface TrendSignal {
  id: string;
  signalScore: number;      // 0.0 to 1.0
  signalType: string;
  weight: number;
  product?: { sku: string; name: string; category: string; };
  rawPayload?: { totalOnHand: number; reason: string; };
  ingestedAt: string;
}

// What the dashboard table displays (transformed version):
export interface DashboardRow {
  id: string;
  sku: string;
  productName: string;
  category: string;
  trendScore: number;        // 0 to 100 (percentage)
  currentStock: number;
  predictedDemand: number;
  signalType: string;
  reason: string;
  isAlert: boolean;          // trendScore > 70 AND stock < 50
}
```

If the backend changes the API response shape, TypeScript immediately shows compile errors everywhere the old shape is used — instead of silent runtime failures.

---

## 23. Troubleshooting Common Issues

| Problem | Cause | Fix |
|---|---|---|
| Login works but dashboard shows blank | Token stored but signals API returns 401 | Log out and log back in |
| "Analyze with AI" shows error snackbar | Backend `GEMINI_API_KEY` not set or wrong model | Check `backend/.env` has a valid key; model is now `gemini-2.5-flash` |
| Chart not rendering | Canvas element not found | Check `ngAfterViewInit` is used, not `ngOnInit` |
| Table not filtering | `filterPredicate` set too late | Set it in `ngOnInit` before data loads (not `ngAfterViewInit`) |
| Mobile nav missing items | Role not in `ROLE_ACCESS` map | Check `auth.service.ts` ROLE_ACCESS definition |
| 401 on every API call | JWT token expired | Log out → log in → new token is issued |
| `ng serve` fails | Wrong directory or dependencies not installed | Run `npm install` in `frontend/` folder |
| Material icons show as text | Google Fonts CDN not loaded | Check `index.html` has the Material Icons font link |

---

## 24. Glossary

| Term | Plain English |
|---|---|
| **SPA** | Single Page Application — Angular loads once, swaps content without full page reloads |
| **Component** | A self-contained UI block with HTML + TypeScript + CSS |
| **Service** | A shared class with logic/data — injected wherever needed |
| **Guard** | Blocks navigation to a route if conditions aren't met |
| **Interceptor** | Intercepts every HTTP request/response to add headers or handle errors |
| **Pipe** | Transforms a value in a template (pure — cached by Angular) |
| **Observable** | A stream of values over time — can be subscribed to |
| **BehaviorSubject** | An Observable that stores and immediately emits the latest value to new subscribers |
| **RxJS** | Library for reactive programming with Observables |
| **takeUntil** | RxJS operator that cancels a subscription when a signal emits |
| **forkJoin** | RxJS operator that runs multiple observables in parallel and waits for all to complete |
| **Router** | Angular's system for mapping URLs to components |
| **RouterOutlet** | A placeholder in HTML where the active route's component renders |
| **Lazy Loading** | Loading a module only when the user navigates to it (not used here, all eager) |
| **ngOnInit** | Lifecycle hook — runs after component is created |
| **ngAfterViewInit** | Lifecycle hook — runs after HTML is fully rendered |
| **ngOnDestroy** | Lifecycle hook — runs before component is removed |
| **MatTableDataSource** | Angular Material class that manages table data + filtering + sorting |
| **FormControl** | Angular class for managing a single form input's value and validation |
| **debounceTime** | Wait N milliseconds after last keystroke before reacting |
| **Memory Leak** | Subscriptions that keep running after a component is destroyed |
| **RBAC** | Role-Based Access Control — what pages/actions a user can access depends on their role |
| **JWT** | JSON Web Token — signed string proving who you are |
| **Proxy** | Angular dev server feature that forwards `/api` calls to the backend on port 3000 |
