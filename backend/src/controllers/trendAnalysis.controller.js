'use strict';

/**
 * trendAnalysis.controller.js
 * ---------------------------
 * LAYER 1 — HTTP only.
 *
 * POST /api/v1/trends/analyze
 * Body: { "keyword": "Winter coming" }
 *
 * Delegates all logic to TrendAnalysisService.
 * Returns the structured analysis report as JSON.
 */

const TrendAnalysisService = require('../services/TrendAnalysisService');

/**
 * POST /api/v1/trends/analyze
 *
 * Body:
 *   { "keyword": "Winter coming" }
 *
 * Success Response (200):
 *   {
 *     "success": true,
 *     "data": {
 *       "keyword":     "Winter coming",
 *       "analyzedAt":  "2026-05-05T15:00:00.000Z",
 *       "summary": {
 *         "totalTrending":  6,
 *         "lowStockAlerts": 2,
 *         "signalsWritten": 2,
 *         "threshold":      50
 *       },
 *       "trendingProducts": [ ... ]
 *     }
 *   }
 *
 * Error Responses:
 *   400 — Missing / invalid keyword
 *   503 — GEMINI_API_KEY not configured
 *   502 — Gemini returned unparseable response
 */
const analyzeTrend = async (req, res, next) => {
  try {
    const { keyword } = req.body;
    const report = await TrendAnalysisService.analyzeKeyword(keyword);
    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/trends/signals
 *
 * Returns recent trend signals stored in the DB for dashboard display.
 * Accepts query params: ?productId=<uuid>&limit=20
 */
const getSignals = async (req, res, next) => {
  try {
    const { TrendSignal, Product } = require('../models');
    const { productId, limit = 20 } = req.query;

    const where = {};
    if (productId) where.productId = productId;

    const signals = await TrendSignal.findAll({
      where,
      include: [{
        model:      Product,
        as:         'product',
        attributes: ['id', 'sku', 'name', 'category'],
      }],
      order:  [['ingestedAt', 'DESC']],
      limit:  Math.min(Number(limit), 100),
    });

    return res.status(200).json({ success: true, data: signals });
  } catch (err) {
    next(err);
  }
};

module.exports = { analyzeTrend, getSignals };
