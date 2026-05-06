'use strict';

/**
 * forecast.controller.js — LAYER 1 HTTP only.
 * GET /api/v1/forecast/:productId
 * Returns a weighted demand forecast by combining active trend signals.
 */

const { Op }                          = require('sequelize');
const { Product, Inventory, TrendSignal } = require('../models');
const NotFoundError                   = require('../models/errors/NotFoundError');

const getForecast = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const now = new Date();

    // 1. Verify product exists
    const product = await Product.findOne({ where: { id: productId, isActive: true } });
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);

    // 2. Fetch active (non-expired) trend signals for this product
    const signals = await TrendSignal.findAll({
      where: {
        productId,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: now } },
        ],
      },
      order: [['signalDate', 'DESC']],
      limit: 10,
    });

    // 3. Compute weighted average trend score
    let weightedScore = 0;
    let totalWeight   = 0;
    signals.forEach(s => {
      weightedScore += parseFloat(s.signalScore) * parseFloat(s.weight);
      totalWeight   += parseFloat(s.weight);
    });
    const avgTrendScore = totalWeight > 0 ? +(weightedScore / totalWeight).toFixed(4) : 0;

    // 4. Fetch inventory levels
    const inventoryRecords = await Inventory.findAll({ where: { productId } });
    const totalOnHand      = inventoryRecords.reduce((s, r) => s + r.quantityOnHand, 0);
    const reorderPoint     = inventoryRecords[0]?.reorderPoint ?? 0;

    // 5. Compute forecast metrics
    const predictedDemand = Math.round(totalOnHand * (1 + avgTrendScore * 1.8));
    const demandGap       = predictedDemand - totalOnHand;
    const alertLevel      = (avgTrendScore > 0.7 && totalOnHand < 50) ? 'CRITICAL'
                          : (avgTrendScore > 0.4)                      ? 'MODERATE'
                          :                                               'LOW';

    return res.status(200).json({
      success: true,
      data: {
        productId,
        sku:             product.sku,
        productName:     product.name,
        avgTrendScore,
        currentStock:    totalOnHand,
        predictedDemand,
        demandGap,
        reorderPoint,
        alertLevel,
        signalCount:     signals.length,
        forecastedAt:    now.toISOString(),
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getForecast };
