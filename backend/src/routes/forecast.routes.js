'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/forecast.controller');
const auth   = require('../middlewares/auth.middleware');

// GET /api/v1/forecast/:productId → demand forecast for a product
router.get('/:productId', auth(['ADMIN', 'MANAGER', 'VIEWER']), ctrl.getForecast);

module.exports = router;
