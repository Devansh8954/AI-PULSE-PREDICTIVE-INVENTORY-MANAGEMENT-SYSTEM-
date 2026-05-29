'use strict';

/**
 * auth.routes.js
 * --------------
 * POST /api/v1/auth/register  → create account + return JWT
 * POST /api/v1/auth/login     → verify credentials + return JWT
 * GET  /api/v1/auth/me        → get current user (auth required)
 */

const router   = require('express').Router();
const ctrl     = require('../controllers/auth.controller');
const auth     = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login',    validate(loginSchema),    ctrl.login);
router.get ('/me',       auth(),                   ctrl.me);

module.exports = router;
