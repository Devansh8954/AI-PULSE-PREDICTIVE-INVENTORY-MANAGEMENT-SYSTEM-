'use strict';

/**
 * errorHandler.middleware.js — Centralized error handler (MUST be last middleware in app.js).
 *
 * Translates known Sequelize/JWT/AppError types into clean HTTP responses.
 * Unknown errors → safe 500 (never leaks stack traces in production).
 *
 * Error map:
 *  SequelizeValidationError            → 422  VALIDATION_ERROR
 *  SequelizeUniqueConstraintError      → 409  DUPLICATE_ENTRY
 *  SequelizeOptimisticLockError        → 409  OPTIMISTIC_LOCK_CONFLICT
 *  SequelizeForeignKeyConstraintError  → 409  FOREIGN_KEY_CONSTRAINT
 *  JsonWebTokenError                   → 401  INVALID_TOKEN
 *  TokenExpiredError                   → 401  TOKEN_EXPIRED
 *  SyntaxError (bad JSON body)         → 400  MALFORMED_JSON
 *  AppError (operational)              → err.statusCode
 *  All others                          → 500  INTERNAL_SERVER_ERROR
 */

const logger   = require('../utils/logger');
const AppError = require('../errors/AppError');

// ── Sequelize translators ────────────────────────────────────────────────────

const handleSequelizeValidationError = (err) => ({
  statusCode: 422,
  code:       'VALIDATION_ERROR',
  message:    'One or more fields failed validation.',
  details:    err.errors.map((e) => ({ field: e.path, message: e.message })),
});

const handleSequelizeUniqueConstraintError = (err) => ({
  statusCode: 409,
  code:       'DUPLICATE_ENTRY',
  message:    `A record with this ${err.errors.map((e) => e.path).join(', ')} already exists.`,
});

const handleSequelizeOptimisticLockError = () => ({
  statusCode: 409, code: 'OPTIMISTIC_LOCK_CONFLICT',
  message: 'Concurrent modification detected — re-fetch and retry.',
});

const handleSequelizeForeignKeyError = () => ({
  statusCode: 409, code: 'FOREIGN_KEY_CONSTRAINT',
  message: 'Operation violates a referential integrity constraint.',
});

// ── JWT translators ──────────────────────────────────────────────────────────

const handleJwtError        = () => ({ statusCode: 401, code: 'INVALID_TOKEN',  message: 'Authentication token is invalid.' });
const handleJwtExpiredError = () => ({ statusCode: 401, code: 'TOKEN_EXPIRED',  message: 'Token has expired. Please log in again.' });

// ── Error dispatch table ─────────────────────────────────────────────────────

const SEQUELIZE_HANDLERS = {
  SequelizeValidationError:           handleSequelizeValidationError,
  SequelizeUniqueConstraintError:     handleSequelizeUniqueConstraintError,
  SequelizeOptimisticLockError:       handleSequelizeOptimisticLockError,
  SequelizeForeignKeyConstraintError: handleSequelizeForeignKeyError,
  JsonWebTokenError:                  handleJwtError,
  TokenExpiredError:                  handleJwtExpiredError,
};

// ── Main error handler ───────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message, name: err.name,
    path: req.path, method: req.method, statusCode: err.statusCode,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // 1. Sequelize + JWT errors — resolved via dispatch table
  const handler = SEQUELIZE_HANDLERS[err.name];
  if (handler) {
    const mapped = handler(err);
    return res.status(mapped.statusCode).json({ success: false, error: mapped });
  }

  // 2. Bad JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, error: { code: 'MALFORMED_JSON', message: 'Request body contains invalid JSON.' } });
  }

  // 3. Known operational AppErrors (NotFoundError, ConflictError, etc.)
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.name, message: err.message,
        ...(err.details  && { details:  err.details  }),
        ...(err.context  && { context:  err.context  }),
      },
    });
  }

  // 4. Unknown / programmer errors — never expose internals
  return res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
