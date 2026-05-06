'use strict';

/**
 * trendSignal.model.js
 * --------------------
 * Sequelize model for the `trend_signals` table.
 *
 * Each row represents one data point from one signal source
 * (e.g., Gemini AI, Google Trends, Twitter) for a specific product.
 *
 * The `signal_score` (stored as DECIMAL 0.0000 → 1.0000) is what
 * TrendAnalysisService writes when it detects a "low stock + trending" hit.
 *
 * Associations (registered in models/index.js):
 *   TrendSignal.belongsTo(Product) → FK: product_id
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../config/db.config');

class TrendSignal extends Model {}

TrendSignal.init(
  {
    id: {
      type:         DataTypes.CHAR(36),
      primaryKey:   true,
      defaultValue: DataTypes.UUIDV4,
      allowNull:    false,
    },

    productId: {
      type:      DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'products', key: 'id' },
      comment:   'Product this signal is correlated to',
    },

    // ── Signal classification ─────────────────────────────────────────────
    signalSource: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      comment:   'GEMINI_AI | GOOGLE_TRENDS | TWITTER | SEASONAL | MANUAL',
    },

    signalType: {
      type: DataTypes.ENUM(
        'DEMAND_SPIKE',
        'DEMAND_DROP',
        'SEASONAL_PEAK',
        'SEASONAL_TROUGH',
        'COMPETITOR_STOCKOUT',
        'PRICE_SENSITIVITY',
        'SOCIAL_BUZZ',
        'CUSTOM'
      ),
      allowNull: false,
      comment:   'Standardized signal category for the scoring engine',
    },

    // ── Core score fields ─────────────────────────────────────────────────

    /**
     * signal_score: Normalized AI-predicted demand strength [0.0000 – 1.0000].
     *  - 1.0 = maximum bullish (very high demand predicted)
     *  - 0.0 = strongly bearish (demand dropping)
     * Written by TrendAnalysisService after AI analysis.
     */
    signalScore: {
      type:      DataTypes.DECIMAL(5, 4),
      allowNull: false,
      validate:  {
        min: { args: [0], msg: 'signal_score cannot be below 0.' },
        max: { args: [1], msg: 'signal_score cannot exceed 1.' },
      },
      comment: 'Normalized signal strength [0.0000 – 1.0000]',
    },

    /**
     * weight: Relative importance multiplier for the forecast model.
     * AI-generated signals typically carry higher weight than manual ones.
     */
    weight: {
      type:         DataTypes.DECIMAL(5, 4),
      allowNull:    false,
      defaultValue: 1.0000,
      comment:      'Relative importance weight for the scoring model',
    },

    // ── Keyword that triggered this signal (from AI analysis) ─────────────
    keyword: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'The search keyword that produced this signal (e.g., "Winter coming")',
    },

    // ── Raw AI / source payload stored for auditability ───────────────────
    rawPayload: {
      type:      DataTypes.JSON,
      allowNull: true,
      comment:   'Full AI response blob — for audit, debugging, and reprocessing',
    },

    // ── Validity window ───────────────────────────────────────────────────
    signalDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    expiresAt: {
      type:      DataTypes.DATE,
      allowNull: true,
      comment:   'Signals past this timestamp are excluded from active forecasting',
    },

    ingestedAt: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName:       'TrendSignal',
    tableName:       'trend_signals',
    freezeTableName: true,
    timestamps:      false,   // table has its own ingestedAt column
    indexes: [
      { fields: ['product_id', 'signal_date'] },
      { fields: ['signal_type', 'signal_source'] },
      { fields: ['signal_score'] },
      { fields: ['expires_at'] },
    ],
  }
);

module.exports = TrendSignal;
