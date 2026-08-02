'use strict';

/**
 * auth.middleware.js — JWT verification + Role-Based Access Control (RBAC)
 *
 * Usage in routes:
 *   auth(['ADMIN', 'MANAGER'])  → only those roles may proceed
 *   auth()                      → any authenticated user may proceed
 *
 * Token format: Authorization: Bearer <JWT>
 */

const jwt        = require('jsonwebtoken');
const { secret } = require('../config/jwt.config');
const AppError   = require('../errors/AppError');

/** Returns middleware that verifies JWT and enforces allowed roles. */
const auth = (allowedRoles = []) => (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) return next(new AppError('Authentication token missing. Please log in.', 401));

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    return next(err); // JsonWebTokenError / TokenExpiredError → caught in errorHandler
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
    return next(new AppError(
      `Access denied. Required roles: [${allowedRoles.join(', ')}]. Your role: ${decoded.role}.`, 403,
    ));
  }

  req.user = decoded; // attach user context for downstream handlers
  next();
};

module.exports = auth;
