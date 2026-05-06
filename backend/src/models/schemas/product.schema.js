'use strict';

const Joi = require('joi');

/**
 * Joi schema for POST /api/v1/products
 */
const createProductSchema = Joi.object({
  sku:            Joi.string().min(2).max(100).uppercase().trim().required(),
  name:           Joi.string().min(2).max(255).trim().required(),
  description:    Joi.string().max(2000).trim().optional().allow('', null),
  category:       Joi.string().min(2).max(100).trim().required(),
  brand:          Joi.string().max(100).trim().optional().allow('', null),
  unitPrice:      Joi.number().precision(4).positive().required(),
  unitOfMeasure:  Joi.string().valid('UNIT', 'KG', 'LITRE', 'BOX', 'PACK').default('UNIT'),
});

/**
 * Joi schema for PUT /api/v1/products/:id
 * `version` is REQUIRED — used for optimistic locking.
 */
const updateProductSchema = Joi.object({
  name:           Joi.string().min(2).max(255).trim().optional(),
  description:    Joi.string().max(2000).trim().optional().allow('', null),
  category:       Joi.string().min(2).max(100).trim().optional(),
  brand:          Joi.string().max(100).trim().optional().allow('', null),
  unitPrice:      Joi.number().precision(4).positive().optional(),
  unitOfMeasure:  Joi.string().valid('UNIT', 'KG', 'LITRE', 'BOX', 'PACK').optional(),
  // ⚡ Version is MANDATORY for optimistic locking — client must echo it back
  version:        Joi.number().integer().min(0).required()
    .messages({ 'any.required': 'version is required for concurrent-safe updates.' }),
}).min(2); // at least one field to update + version

module.exports = { createProductSchema, updateProductSchema };
