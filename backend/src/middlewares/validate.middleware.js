'use strict';

/**
 * validate.middleware.js
 * ----------------------
 * Factory that returns a middleware validating req.body against a Joi schema.
 *
 * On validation failure → throws ValidationError (422) with field-level details.
 * On success → strips unknown fields (stripUnknown) and assigns clean body
 *              back to req.body before calling next().
 *
 * Usage:
 *   router.post('/', validate(createProductSchema), ctrl.createProduct);
 */

const ValidationError = require('../models/errors/ValidationError');

const validate = (schema) => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly:   false,   // collect ALL errors, not just the first
      stripUnknown: true,    // remove fields not in schema (security)
    });

    if (error) {
      const details = error.details.map((d) => ({
        field:   d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return next(new ValidationError('Request validation failed.', details));
    }

    req.body = value;  // use sanitized + type-coerced value
    next();
  };
};

module.exports = validate;
