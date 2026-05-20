'use strict';

const express             = require('express');
const authRoutes          = require('./auth.routes');
const productRoutes       = require('./product.routes');
const inventoryRoutes     = require('./inventory.routes');
const vendorRoutes        = require('./vendor.routes');
const signalRoutes        = require('./signal.routes');
const trendAnalysisRoutes = require('./trendAnalysis.routes');
const forecastRoutes      = require('./forecast.routes');
const purchaseOrderRoutes = require('./purchaseOrder.routes');

const router = express.Router();

router.use('/auth',            authRoutes);
router.use('/products',        productRoutes);
router.use('/inventory',       inventoryRoutes);
router.use('/vendors',         vendorRoutes);
router.use('/signals',         signalRoutes);
router.use('/trends',          trendAnalysisRoutes);
router.use('/forecast',        forecastRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);

module.exports = router;
