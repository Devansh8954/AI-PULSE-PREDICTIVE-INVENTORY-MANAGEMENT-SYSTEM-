'use strict';

const Joi = require('joi');

/**
 * Joi schema for POST /api/v1/vendors
 */
const createVendorSchema = Joi.object({
  name:         Joi.string().min(2).max(255).trim().required(),
  contactEmail: Joi.string().email().max(320).trim().required(),
  contactPhone: Joi.string().max(20).trim().optional().allow('', null),
  address:      Joi.string().max(1000).trim().optional().allow('', null),
});

module.exports = { createVendorSchema };
