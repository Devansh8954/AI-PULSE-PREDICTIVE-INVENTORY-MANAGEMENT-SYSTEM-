'use strict';

const Joi = require('joi');

/**
 * auth.schema.js
 * --------------
 * Joi validation schemas for auth endpoints.
 */

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(150).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required()
              .messages({ 'string.min': 'Password must be at least 8 characters.' }),
  role:     Joi.string().valid('ADMIN', 'MANAGER', 'VIEWER').default('VIEWER'),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
