'use strict';

const AppError = require('./AppError');

/**
 * ValidationError — HTTP 422
 * Thrown when incoming request data fails business-level or Joi validation.
 * Can carry field-level error details for the client to display inline.
 */
class ValidationError extends AppError {
  /**
   * @param {string}   message - Summary of what failed.
   * @param {object[]} [details] - Array of { field, message } objects.
   */
  constructor(message = 'Validation failed.', details = []) {
    super(message, 422);
    this.name    = 'ValidationError';
    this.details = details;
  }
}

module.exports = ValidationError;
