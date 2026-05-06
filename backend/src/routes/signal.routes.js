'use strict';

const router   = require('express').Router();
const ctrl     = require('../controllers/signal.controller');
const auth     = require('../middlewares/auth.middleware');

// GET  /api/v1/signals          → list signals (filterable by productId, signalType)
// GET  /api/v1/signals/:id      → get one signal
router.get('/',    auth(['ADMIN', 'MANAGER', 'VIEWER']), ctrl.listSignals);
router.get('/:id', auth(['ADMIN', 'MANAGER', 'VIEWER']), ctrl.getSignalById);

module.exports = router;
