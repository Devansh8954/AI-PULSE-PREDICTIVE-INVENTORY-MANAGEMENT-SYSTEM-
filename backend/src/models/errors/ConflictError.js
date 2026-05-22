'use strict';

const AppError = require('./AppError');

/**
 * ConflictError — HTTP 409
 * Thrown when an optimistic lock version mismatch is detected.
 * This means another process updated the record after the client
 * last fetched it. The client must re-fetch and retry.
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict — the record was modified concurrently. Re-fetch and retry.') {
    super(message, 409);
  }
}

module.exports = ConflictError;
