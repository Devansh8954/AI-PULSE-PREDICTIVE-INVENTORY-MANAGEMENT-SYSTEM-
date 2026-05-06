'use strict';

const router   = require('express').Router();
const ctrl     = require('../controllers/vendor.controller');
const auth     = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createVendorSchema } = require('../models/schemas/vendor.schema');

router.get ('/',    auth(['ADMIN', 'MANAGER', 'VIEWER']),              ctrl.listVendors);
router.get ('/:id', auth(['ADMIN', 'MANAGER', 'VIEWER']),              ctrl.getVendorById);
router.post('/',    auth(['ADMIN']),          validate(createVendorSchema), ctrl.createVendor);

module.exports = router;
