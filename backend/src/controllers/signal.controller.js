'use strict';

/**
 * signal.controller.js
 * --------------------
 * LAYER 1 — HTTP only.
 * Handles raw trend_signal CRUD (separate from AI-powered TrendAnalysisController).
 */

const { TrendSignal, Product } = require('../models');
const NotFoundError = require('../errors/NotFoundError');

const listSignals = async (req, res, next) => {
  try {
    const { productId, limit = 50, signalType } = req.query;
    const where = {};
    if (productId)  where.productId  = productId;
    if (signalType) where.signalType = signalType;

    const signals = await TrendSignal.findAll({
      where,
      include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'category'] }],
      order:   [['ingested_at', 'DESC']],
      limit:   Math.min(Number(limit), 200),
    });

    return res.status(200).json({ success: true, data: signals });
  } catch (err) { next(err); }
};

const getSignalById = async (req, res, next) => {
  try {
    const signal = await TrendSignal.findByPk(req.params.id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'category'] }],
    });
    if (!signal) throw new NotFoundError(`Trend signal '${req.params.id}' not found.`);
    return res.status(200).json({ success: true, data: signal });
  } catch (err) { next(err); }
};

module.exports = { listSignals, getSignalById };
