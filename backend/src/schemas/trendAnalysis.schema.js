'use strict';

const Joi = require('joi');

/**
 * POST /api/v1/trends/analyze
 */
const analyzeTrendSchema = Joi.object({
  keyword: Joi.string().min(2).max(255).trim().required()
    .messages({
      'any.required': 'keyword is required. Provide a search term such as "Winter coming".',
      'string.min':   'keyword must be at least 2 characters.',
    }),
});

module.exports = { analyzeTrendSchema };
