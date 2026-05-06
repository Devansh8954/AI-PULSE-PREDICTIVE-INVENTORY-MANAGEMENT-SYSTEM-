'use strict';

const router   = require('express').Router();
const ctrl     = require('../controllers/inventory.controller');
const auth     = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { adjustInventorySchema } = require('../models/schemas/inventory.schema');

// GET   /api/v1/inventory              → list all inventory (paginated; ?lowStock=true for alerts)
// GET   /api/v1/inventory/:id          → get one record (includes current version for OCC)
// PATCH /api/v1/inventory/:id/adjust   → ⚡ OCC stock adjustment (requires delta + version)
router.get  ('/',           auth(['ADMIN', 'MANAGER', 'VIEWER']),              ctrl.listInventory);
router.get  ('/:id',        auth(['ADMIN', 'MANAGER', 'VIEWER']),              ctrl.getInventoryById);
router.patch('/:id/adjust', auth(['ADMIN', 'MANAGER']), validate(adjustInventorySchema), ctrl.adjustStock);

module.exports = router;
