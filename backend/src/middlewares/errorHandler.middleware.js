'use strict';

/**
 * errorHandler.middleware.js
 * --------------------------
 * CENTRALIZED ERROR HANDLER — must be the LAST middleware registered in app.js.
 *
 * Design pattern: "Error-First Express Middleware" (4-argument signature).
 *
 * Responsibilities:
 *  1. Log every error via Winston (always, regardless of type).
 *  2. Translate known Sequelize errors into meaningful HTTP responses.
 *  3. Translate application domain errors (AppError subclasses) into HTTP responses.
 *  4. For unknown/unexpected errors, return a safe generic 500 message
 *     (never leak stack traces in production).
 *
 * Error taxonomy handled:
 *  ┌─────────────────────────────────────┬───────────────┐
 *  │ Error Type                          │ HTTP Status   │
 *  ├─────────────────────────────────────┼───────────────┤
 *  │ AppError (operational)              │ err.statusCode│
 *  │ SequelizeValidationError            │ 422           │
 *  │ SequelizeUniqueConstraintError      │ 409           │
 *  │ SequelizeOptimisticLockError        │ 409           │
 *  │ SequelizeForeignKeyConstraintError  │ 409           │
 *  │ JsonWebTokenError / TokenExpiredError│ 401          │
 *  │ SyntaxError (bad JSON body)         │ 400           │
 *  │ All others (programmer errors)      │ 500           │
 *  └─────────────────────────────────────┴───────────────┘
 */

const logger    = require('../utils/logger');
const AppError  = require('../errors/AppError');

// ── Sequelize error translators ──────────────────────────────────────────────

const handleSequelizeValidationError = (err) => {
  const details = err.errors.map((e) => ({ field: e.path, message: e.message }));
  return {
    statusCode: 422,
    code:       'VALIDATION_ERROR',
    message:    'One or more fields failed validation.',
    details,
  };
};

const handleSequelizeUniqueConstraintError = (err) => {
  const fields = err.errors.map((e) => e.path).join(', ');
  return {
    statusCode: 409,
    code:       'DUPLICATE_ENTRY',
    message:    `A record with this ${fields} already exists.`,
  };
};

const handleSequelizeOptimisticLockError = () => ({
  statusCode: 409,
  code:       'OPTIMISTIC_LOCK_CONFLICT',
  message:    'Concurrent modification detected — re-fetch the resource and retry your update.',
});

const handleSequelizeForeignKeyError = () => ({
  statusCode: 409,
  code:       'FOREIGN_KEY_CONSTRAINT',
  message:    'Operation violates a referential integrity constraint.',
});

// ── JWT error translators ────────────────────────────────────────────────────

const handleJwtError = () => ({
  statusCode: 401,
  code:       'INVALID_TOKEN',
  message:    'Authentication token is invalid.',
});

const handleJwtExpiredError = () => ({
  statusCode: 401,
  code:       'TOKEN_EXPIRED',
  message:    'Authentication token has expired. Please log in again.',
});

// ── Main error handler ───────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Always log the full error internally
  logger.error({
    message:    err.message,
    name:       err.name,
    path:       req.path,
    method:     req.method,
    statusCode: err.statusCode,
    stack:      process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // ── 1. Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    const mapped = handleSequelizeValidationError(err);
    return res.status(mapped.statusCode).json({ success: false, error: mapped });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const mapped = handleSequelizeUniqueConstraintError(err);
    return res.status(mapped.statusCode).json({ success: false, error: mapped });
  }

  if (err.name === 'SequelizeOptimisticLockError') {
    const mapped = handleSequelizeOptimisticLockError();
    return res.status(mapped.statusCode).json({ success: false, error: mapped });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const mapped = handleSequelizeForeignKeyError();
    return res.status(mapped.statusCode).json({ success: false, error: mapped });
  }

  // ── 2. JWT errors
  if (err.name === 'JsonWebTokenError') {
    const mapped = handleJwtError();
    return res.status(mapped.statusCode).json({ success: false, error: mapped });
  }

  if (err.name === 'TokenExpiredError') {
    const mapped = handleJwtExpiredError();
    return res.status(mapped.statusCode).json({ success: false, error: mapped });
  }

  // ── 3. Bad JSON body from client
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: { code: 'MALFORMED_JSON', message: 'Request body contains invalid JSON.' },
    });
  }

  // ── 4. Known operational AppErrors (NotFoundError, ConflictError, ConcurrentUpdateError, etc.)
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code:    err.name,
        message: err.message,
        ...(err.details  && { details:  err.details  }),   // ValidationError field list
        ...(err.context  && { context:  err.context  }),   // ConcurrentUpdateError diagnostic
      },
    });
  }

  // ── 5. Unknown / programmer errors — never expose internals
  return res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      // Stack included ONLY in development — never in production
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
