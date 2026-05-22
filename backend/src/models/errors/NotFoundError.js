'use strict';

const AppError = require('./AppError');

/**
 * NotFoundError — HTTP 404
 * Thrown when a requested resource does not exist in the DB.
 */
class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404);
  }
}

module.exports = NotFoundError;
