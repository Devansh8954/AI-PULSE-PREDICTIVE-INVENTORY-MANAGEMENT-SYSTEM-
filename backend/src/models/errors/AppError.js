'use strict';

/**
 * AppError.js
 * -----------
 * Base class for all operational (expected) errors in the application.
 *
 * Distinguishes between:
 *   isOperational: true  → handled/expected error, show message to client
 *   isOperational: false → programmer error (bug), never expose to client
 *
 * The centralized errorHandler checks this flag to decide whether to
 * pass the raw message or a generic "Internal Server Error" message.
 */
class AppError extends Error {
  /**
   * @param {string} message   - Human-readable error description.
   * @param {number} statusCode - HTTP status code (4xx or 5xx).
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode    = statusCode;
    this.status        = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;   // mark as a known, handled error

    // Capture stack trace without including the constructor frame
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
