'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const router       = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const rateLimiter  = require('./middlewares/rateLimiter.middleware');

const app = express();

app.use(helmet());
// Support comma-separated list of origins: e.g. "http://localhost:4200,http://localhost"
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Postman, curl, server-side)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" is not allowed.`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global rate limiter, except for high-traffic product list reads.
// This prevents 429 on common UI pagination calls like GET /api/v1/products?limit=100.
app.use('/api', (req, res, next) => {
  // req.originalUrl example: /api/v1/products?limit=100
  if (req.method === 'GET' && /^\/api\/v1\/products(\?.*)?$/i.test(req.originalUrl)) {
    return next();
  }
  return rateLimiter(req, res, next);
});


// ── Root index — shows available endpoints ────────────────────────────────────
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    name:    'AI-Pulse Predictive Inventory API',
    version: 'v1',
    health:  '/health',
    base:    '/api/v1',
    endpoints: {
      auth:      { register: 'POST /api/v1/auth/register', login: 'POST /api/v1/auth/login', me: 'GET /api/v1/auth/me' },
      products:  'GET | POST /api/v1/products',
      inventory: 'GET | PATCH /api/v1/inventory',
      vendors:   'GET | POST /api/v1/vendors',
      signals:   'GET /api/v1/signals',
      trends:    'GET /api/v1/trends',
      forecast:  'GET /api/v1/forecast/:productId',
    },
  });
});

// ── Health check (no auth required) ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── Versioned API ─────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: 'The requested endpoint does not exist.' },
  });
});

// Centralized error handler — MUST be registered last
app.use(errorHandler);

module.exports = app;
