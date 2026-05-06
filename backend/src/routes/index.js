'use strict';

const express             = require('express');
const productRoutes       = require('./product.routes');
const inventoryRoutes     = require('./inventory.routes');
const vendorRoutes        = require('./vendor.routes');
const signalRoutes        = require('./signal.routes');
const trendAnalysisRoutes = require('./trendAnalysis.routes');
const forecastRoutes      = require('./forecast.routes');

const router = express.Router();

router.use('/products',   productRoutes);
router.use('/inventory',  inventoryRoutes);
router.use('/vendors',    vendorRoutes);
router.use('/signals',    signalRoutes);
router.use('/trends',     trendAnalysisRoutes);
router.use('/forecast',   forecastRoutes);

module.exports = router;
