'use strict';

/**
 * purchaseOrder.routes.js
 * -----------------------
 * Role-based PO workflow:
 *
 *  MANAGER   → creates PO (PENDING), approves (PENDING→APPROVED), cancels (PENDING/APPROVED)
 *  WAREHOUSE → dispatches (APPROVED→DISPATCHED), receives (DISPATCHED→RECEIVED)
 *  ADMIN     → full access across all transitions
 *
 * GET   /api/v1/purchase-orders              → list (ADMIN, MANAGER, WAREHOUSE, VIEWER)
 * GET   /api/v1/purchase-orders/:id          → get one  (ADMIN, MANAGER, WAREHOUSE)
 * POST  /api/v1/purchase-orders              → create   (ADMIN, MANAGER)
 * PATCH /api/v1/purchase-orders/:id/status   → update   (ADMIN, MANAGER, WAREHOUSE)
 */

const router   = require('express').Router();
const ctrl     = require('../controllers/purchaseOrder.controller');
const auth     = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPurchaseOrderSchema, updateStatusSchema } = require('../models/schemas/purchaseOrder.schema');

router.get  ('/',            auth(['ADMIN', 'MANAGER', 'WAREHOUSE', 'VIEWER']),                          ctrl.listPurchaseOrders);
router.get  ('/:id',         auth(['ADMIN', 'MANAGER', 'WAREHOUSE']),                                    ctrl.getPurchaseOrderById);
router.post ('/',            auth(['ADMIN', 'MANAGER']), validate(createPurchaseOrderSchema),            ctrl.createPurchaseOrder);
router.patch('/:id/status',  auth(['ADMIN', 'MANAGER', 'WAREHOUSE']), validate(updateStatusSchema),      ctrl.updateStatus);

module.exports = router;
