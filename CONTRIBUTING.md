# Contributing to AI-Pulse

Thanks for taking the time to contribute! Whether you're fixing a bug, adding a feature, or improving documentation, this guide will help you get set up and keep the codebase consistent.

---

## Project Architecture Quick Reference

Understanding the layered architecture saves a lot of time:

```
Frontend (Angular 17)
  └── features/<role>-dashboard/   ← Role-specific UI
  └── core/services/               ← HTTP service layer (one service per domain)
  └── core/interceptors/           ← JWT injection on every request
  └── shared/components/           ← Reusable UI components (sidebar, loading-row)
  └── shared/pipes/                ← Reusable Angular pipes (statusClass, statusIcon)

Backend (Node.js + Express)
  └── controllers/   ← Parse HTTP req → call service → return HTTP response
  └── services/      ← Business logic only, no HTTP awareness
  └── repositories/  ← All SQL/Sequelize queries live here
  └── middlewares/   ← Auth, rate limiting, error handling, validation
  └── utils/         ← Logger, shared helpers (auth.helpers.js)
```

**Core rules:**
- HTTP concerns (`req`, `res`, status codes) never leak into services or repositories.
- SQL never leaks into controllers.
- Business rules never live in repositories.

---

## Setting Up for Development

Follow [SETUP.md](SETUP.md) for the full walkthrough. The short version:

```bash
# Terminal 1 — Backend
cd backend && npm install && npm run dev

# Terminal 2 — Frontend
cd frontend && npm install && ng serve
```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. All PRs merge here. |
| `feature/<short-name>` | New feature development |
| `fix/<short-name>` | Bug fixes |
| `chore/<short-name>` | Tooling, deps, refactors that don't affect behavior |

---

## Making a Change

1. **Branch off `main`:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Follow the layer rules** — if you're adding a new API route, you need:
   - A route entry in `routes/`
   - A controller method in `controllers/`
   - Business logic in `services/`
   - SQL in `repositories/`

3. **Add or update tests** for any service-layer changes:
   ```bash
   cd backend && npm test
   ```

4. **Lint before pushing:**
   ```bash
   cd backend && npm run lint
   ```

5. **Open a pull request** against `main` with a clear description.

---

## Adding a New Shared Frontend Component

If a UI pattern repeats across more than two dashboards, extract it into `shared/`:

```
shared/
  components/
    my-component/
      my-component.component.ts
  pipes/
    my.pipe.ts
```

Register it in `app.module.ts` under the `declarations` array and export it if needed by other modules.

---

## Code Style

### Backend (JavaScript)
- `'use strict'` at the top of every file.
- JSDoc comments on all exported functions — include `@param`, `@returns`, and `@throws`.
- Error responses always go through `next(err)`, never `res.json()` directly in error paths.
- Use `AppError` subclasses for known operational errors.

### Frontend (TypeScript)
- Private class members are prefixed with nothing — use `private` keyword only.
- Reactive streams use `takeUntil(this.destroy$)` to prevent memory leaks.
- Template logic should be minimal — move anything complex to the component class.
- Shared pipes are preferred over component methods for pure value transformations.

---

## Running Tests

```bash
cd backend
npm test                  # all tests
npm run test:coverage     # coverage report (60% line coverage threshold)
npm run lint              # ESLint check
```

Coverage reports are generated in `backend/coverage/`. The CI pipeline runs these automatically on every push.

---

## Commit Message Format

Use conventional commits for a clean git history:

```
feat: add CSV export to Analyst dashboard
fix: resolve chart canvas race condition in AfterViewInit
chore: upgrade Chart.js to v4.4
docs: update SETUP.md with Windows MySQL steps
refactor: extract JWT signing into auth.helpers.js
```

---

## Questions?

Open a GitHub Issue with the `question` label. Include:
- What you expected to happen
- What actually happened
- The relevant log output
