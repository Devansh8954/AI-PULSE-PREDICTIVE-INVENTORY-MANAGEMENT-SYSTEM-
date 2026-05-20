'use strict';

/**
 * purchaseOrder.routes.js
 * -----------------------
 * GET   /api/v1/purchase-orders              → list (ADMIN, MANAGER, VIEWER)
 * GET   /api/v1/purchase-orders/:id          → get one
 * POST  /api/v1/purchase-orders              → create (ADMIN, MANAGER)
 * PATCH /api/v1/purchase-orders/:id/status   → update status (ADMIN, MANAGER)
 */

const router   = require('express').Router();
const ctrl     = require('../controllers/purchaseOrder.controller');
const auth     = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPurchaseOrderSchema, updateStatusSchema } = require('../models/schemas/purchaseOrder.schema');

router.get  ('/',              auth(['ADMIN', 'MANAGER', 'VIEWER']),                               ctrl.listPurchaseOrders);
router.get  ('/:id',           auth(['ADMIN', 'MANAGER', 'VIEWER']),                               ctrl.getPurchaseOrderById);
router.post ('/',              auth(['ADMIN', 'MANAGER']), validate(createPurchaseOrderSchema),    ctrl.createPurchaseOrder);
router.patch('/:id/status',    auth(['ADMIN', 'MANAGER']), validate(updateStatusSchema),           ctrl.updateStatus);

module.exports = router;
