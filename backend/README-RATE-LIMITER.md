# Rate limiter notes

This repo uses `express-rate-limit` via `src/middlewares/rateLimiter.middleware.js`.

The limiter is mounted in `src/app.js`.

If you need to troubleshoot `429 Too Many Requests` responses for a specific endpoint, check:
- `backend/.env` for `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`
- whether the limiter is mounted globally for the path
- RateLimit response headers (`RateLimit-Limit`, `RateLimit-Remaining`, etc.)

