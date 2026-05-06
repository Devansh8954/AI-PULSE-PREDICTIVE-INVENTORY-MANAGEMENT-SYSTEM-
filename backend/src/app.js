'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const router       = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const rateLimiter  = require('./middlewares/rateLimiter.middleware');
const logger       = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:4200' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/api', rateLimiter);

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Versioned API
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
