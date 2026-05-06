'use strict';

/**
 * models/index.js
 * ---------------
 * Central registry that:
 *  1. Imports all Sequelize models.
 *  2. Defines ALL associations in one place (Single Responsibility Principle).
 *     Keeping associations here prevents circular-require issues.
 *  3. Exports both models and the sequelize instance for use in repositories.
 *
 * Association design:
 *  - Product      hasMany Inventory    (multi-warehouse support)
 *  - Inventory    belongsTo Product    (FK: product_id)
 *  - Inventory    belongsTo Vendor     (FK: vendor_id)
 *  - Vendor       hasMany Inventory
 *  - TrendSignal  belongsTo Product    (FK: product_id)
 *  - Product      hasMany TrendSignal
 */

const { sequelize } = require('../config/db.config');
const Product       = require('./product.model');
const Inventory     = require('./inventory.model');
const Vendor        = require('./vendor.model');
const TrendSignal   = require('./trendSignal.model');

// ── Product ↔ Inventory ──────────────────────────────────────────────────────
// A product can have multiple inventory records (one per warehouse location).
Product.hasMany(Inventory, {
  foreignKey:  'productId',
  as:          'inventoryRecords',
  onDelete:    'RESTRICT',
  onUpdate:    'CASCADE',
});

Inventory.belongsTo(Product, {
  foreignKey: 'productId',
  as:         'product',
});

// ── Vendor ↔ Inventory ───────────────────────────────────────────────────────
Vendor.hasMany(Inventory, {
  foreignKey: 'vendorId',
  as:         'inventoryRecords',
  onDelete:   'RESTRICT',
  onUpdate:   'CASCADE',
});

Inventory.belongsTo(Vendor, {
  foreignKey: 'vendorId',
  as:         'vendor',
});

// ── Product ↔ TrendSignal ────────────────────────────────────────────────────
Product.hasMany(TrendSignal, {
  foreignKey: 'productId',
  as:         'trendSignals',
  onDelete:   'CASCADE',
  onUpdate:   'CASCADE',
});

TrendSignal.belongsTo(Product, {
  foreignKey: 'productId',
  as:         'product',
});

module.exports = { sequelize, Product, Inventory, Vendor, TrendSignal };
