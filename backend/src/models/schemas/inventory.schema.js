'use strict';

const Joi = require('joi');

/**
 * Joi schema for PATCH /api/v1/inventory/:id/adjust
 */
const adjustInventorySchema = Joi.object({
  delta:   Joi.number().integer().not(0).required()
    .messages({
      'any.required': 'delta is required (e.g. -5 to remove 5 units, +10 to add 10 units).',
      'number.base':  'delta must be an integer.',
      'any.invalid':  'delta cannot be zero.',
    }),
  version: Joi.number().integer().min(0).required()
    .messages({ 'any.required': 'version is required for optimistic locking — echo it from the last GET response.' }),
  reason:  Joi.string().max(500).trim().optional().allow('', null),
});

module.exports = { adjustInventorySchema };
