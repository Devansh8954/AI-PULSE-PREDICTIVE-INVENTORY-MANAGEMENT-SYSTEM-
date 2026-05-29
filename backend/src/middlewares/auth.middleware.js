'use strict';

/**
 * auth.middleware.js
 * ------------------
 * JWT verification + Role-Based Access Control (RBAC) factory.
 *
 * Usage in routes:
 *   auth(['ADMIN', 'MANAGER'])  → only ADMIN and MANAGER may proceed
 *   auth()                      → any authenticated user may proceed
 *
 * Token format expected in header:
 *   Authorization: Bearer <JWT>
 */

const jwt         = require('jsonwebtoken');
const { secret }  = require('../config/jwt.config');
const AppError    = require('../errors/AppError');

/**
 * Returns an Express middleware that verifies JWT and checks allowed roles.
 * @param {string[]} [allowedRoles] - If empty/omitted, any valid token passes.
 */
const auth = (allowedRoles = []) => {
  return (req, res, next) => {
    // ── 1. Extract token
    const authHeader = req.headers['authorization'] || '';
    const token      = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return next(new AppError('Authentication token missing. Please log in.', 401));
    }

    // ── 2. Verify signature & expiry
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      // JsonWebTokenError or TokenExpiredError → caught in errorHandler
      return next(err);
    }

    // ── 3. Role check
    if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
      return next(
        new AppError(
          `Access denied. Required roles: [${allowedRoles.join(', ')}]. Your role: ${decoded.role}.`,
          403,
        ),
      );
    }

    // ── 4. Attach user context for downstream use
    req.user = decoded;
    next();
  };
};

module.exports = auth;
