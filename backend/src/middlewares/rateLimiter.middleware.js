'use strict';

/**
 * rateLimiter.middleware.js
 * -------------------------
 * Applies a sliding-window rate limit on all /api routes.
 * Prevents brute-force and DDoS at the application layer.
 *
 * Dev mode  : localhost requests are skipped entirely — no limit.
 * Production: 100 requests per IP per 15-minute window (configurable via env).
 * On breach → 429 Too Many Requests with Retry-After header.
 */

const rateLimit = require('express-rate-limit');

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

const rateLimiter = rateLimit({
  windowMs:         Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:              Number(process.env.RATE_LIMIT_MAX)        || (isDev ? 2000 : 100),
  standardHeaders:  true,   // include RateLimit-* headers in response
  legacyHeaders:    false,

  // ── Skip rate-limiting for localhost in development mode ──────────────────
  skip: (req) => {
    if (!isDev) return false;
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },

  message: {
    success: false,
    error: {
      code:    'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please wait and try again.',
    },
  },
});

module.exports = rateLimiter;
