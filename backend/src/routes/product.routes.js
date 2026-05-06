'use strict';

const router   = require('express').Router();
const ctrl     = require('../controllers/product.controller');
const auth     = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createProductSchema, updateProductSchema } = require('../models/schemas/product.schema');

// ── CRUD
router.get   ('/',     auth(['ADMIN', 'MANAGER', 'VIEWER']), ctrl.listProducts);
router.get   ('/:id',  auth(['ADMIN', 'MANAGER', 'VIEWER']), ctrl.getProductById);
router.post  ('/',     auth(['ADMIN']),                      validate(createProductSchema), ctrl.createProduct);
router.put   ('/:id',  auth(['ADMIN', 'MANAGER']),           validate(updateProductSchema), ctrl.updateProduct);
router.delete('/:id',  auth(['ADMIN']),                      ctrl.deleteProduct);

// ── Inventory join (key endpoint)
// GET /api/v1/products/:id/inventory
router.get   ('/:id/inventory', auth(['ADMIN', 'MANAGER', 'VIEWER']), ctrl.getInventory);

module.exports = router;
