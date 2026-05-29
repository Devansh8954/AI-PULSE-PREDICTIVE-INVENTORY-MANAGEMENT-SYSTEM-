'use strict';

const Joi = require('joi');

const lineItemSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity:  Joi.number().integer().min(1).required(),
  unitCost:  Joi.number().min(0).default(0),
});

const createPurchaseOrderSchema = Joi.object({
  vendorId:             Joi.string().uuid().required(),
  lineItems:            Joi.array().items(lineItemSchema).min(1).required(),
  notes:                Joi.string().max(1000).allow('', null),
  expectedDeliveryDate: Joi.string().isoDate().allow('', null),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('PENDING', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED')
    .required(),
});

module.exports = { createPurchaseOrderSchema, updateStatusSchema };
