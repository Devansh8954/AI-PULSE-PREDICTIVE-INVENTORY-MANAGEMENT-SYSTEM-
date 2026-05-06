'use strict';

/**
 * product.model.js
 * ----------------
 * Sequelize model for the `products` table.
 *
 * Key design decisions:
 *
 * 1. `version` (BIGINT, default 0):
 *    Implements Optimistic Locking. Sequelize's built-in optimistic locking
 *    is activated by passing `{ version: true }` to the model options.
 *    Sequelize will automatically:
 *      - Include `version` in every UPDATE WHERE clause.
 *      - Increment `version` after a successful save.
 *      - Throw `OptimisticLockError` if the version in DB ≠ version in instance.
 *    The controller catches `OptimisticLockError` → returns HTTP 409 Conflict.
 *
 * 2. `paranoid: true` (inherited from global define) adds `deleted_at`;
 *    Product.destroy() soft-deletes; use force: true for hard delete.
 *
 * 3. `freezeTableName: true` prevents Sequelize from pluralising to 'products'.
 *    We manage the table name explicitly.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../config/db.config');

class Product extends Model {}

Product.init(
  {
    // ── Primary Key: UUID string (matches DB DEFAULT (UUID()))
    id: {
      type:         DataTypes.CHAR(36),
      primaryKey:   true,
      defaultValue: DataTypes.UUIDV4,
      allowNull:    false,
      comment:      'UUIDv4 primary key',
    },

    // ── Stock Keeping Unit — unique across all products
    sku: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      unique:    { name: 'uq_product_sku', msg: 'SKU must be unique.' },
      validate:  {
        notEmpty: { msg: 'SKU cannot be an empty string.' },
        len:      { args: [2, 100], msg: 'SKU must be between 2 and 100 characters.' },
      },
      comment: 'Stock Keeping Unit — globally unique product code',
    },

    // ── Human-readable product name
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      validate:  {
        notEmpty: { msg: 'Product name cannot be empty.' },
        len:      { args: [2, 255], msg: 'Name must be between 2 and 255 characters.' },
      },
    },

    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Product classification
    category: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      validate:  { notEmpty: { msg: 'Category is required.' } },
    },

    brand: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },

    // ── Pricing — stored as high-precision decimal
    unitPrice: {
      type:      DataTypes.DECIMAL(12, 4),
      allowNull: false,
      validate:  {
        min: { args: [0], msg: 'Unit price must be a non-negative number.' },
        isDecimal: { msg: 'Unit price must be a valid decimal number.' },
      },
      comment: 'Price in base currency',
    },

    // ── Unit of measure
    unitOfMeasure: {
      type:         DataTypes.ENUM('UNIT', 'KG', 'LITRE', 'BOX', 'PACK'),
      allowNull:    false,
      defaultValue: 'UNIT',
    },

    // ── Soft-delete flag (used alongside paranoid deletedAt)
    isActive: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
    },

    // ── ⚡ OPTIMISTIC LOCKING VERSION COLUMN ──────────────────────────
    // When `version: true` is set in model options, Sequelize:
    //   • Adds this to UPDATE statements: WHERE version = <current>
    //   • Auto-increments after each successful save.
    //   • Throws OptimisticLockError on version mismatch (concurrent edit).
    // This prevents the "Lost Update" anomaly in concurrent environments.
    // ─────────────────────────────────────────────────────────────────
    version: {
      type:         DataTypes.BIGINT.UNSIGNED,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Optimistic locking version — auto-incremented by Sequelize on every save',
    },
  },
  {
    sequelize,
    modelName:     'Product',
    tableName:     'products',
    freezeTableName: true,

    // ── 🔒 Enable Sequelize's built-in Optimistic Locking
    version: true,

    // ── Indexes mirroring schema.sql for query performance
    indexes: [
      { fields: ['category'] },
      { fields: ['is_active'] },
      { fields: ['brand', 'category'] },
    ],
  }
);

module.exports = Product;
