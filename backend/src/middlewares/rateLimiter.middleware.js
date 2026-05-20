'use strict';

/**
 * rateLimiter.middleware.js
 * -------------------------
 * Applies a sliding-window rate limit on all /api routes.
 * Prevents brute-force and DDoS at the application layer.
 *
 * Config: 100 requests per IP per 15-minute window.
 * On breach → 429 Too Many Requests with Retry-After header.
 */

const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs:         Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:              Number(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders:  true,            // include RateLimit-* headers in response
  legacyHeaders:    false,
  message: {
    success: false,
    error: {
      code:    'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please wait and try again.',
    },
  },
});

module.exports = rateLimiter;
