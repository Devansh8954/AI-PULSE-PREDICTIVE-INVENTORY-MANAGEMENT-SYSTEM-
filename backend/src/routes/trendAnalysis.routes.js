'use strict';

const router   = require('express').Router();
const ctrl     = require('../controllers/trendAnalysis.controller');
const auth     = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { analyzeTrendSchema } = require('../models/schemas/trendAnalysis.schema');

// POST /api/v1/trends/analyze  → trigger AI analysis for a keyword
router.post('/analyze',  auth(['ADMIN', 'MANAGER']), validate(analyzeTrendSchema), ctrl.analyzeTrend);

// GET  /api/v1/trends/signals  → list persisted trend signals
router.get ('/signals',  auth(['ADMIN', 'MANAGER', 'WAREHOUSE', 'VIEWER']),                ctrl.getSignals);

module.exports = router;
