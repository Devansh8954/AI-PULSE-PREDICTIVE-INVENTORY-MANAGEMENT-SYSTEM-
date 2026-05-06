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
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              100,              // max requests per window per IP
  standardHeaders:  true,            // include RateLimit-* headers in response
  legacyHeaders:    false,
  message: {
    success: false,
    error: {
      code:    'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please wait 15 minutes and try again.',
    },
  },
});

module.exports = rateLimiter;
