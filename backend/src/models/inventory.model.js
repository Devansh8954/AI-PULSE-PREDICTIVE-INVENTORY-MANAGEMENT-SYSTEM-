'use strict';

/**
 * inventory.model.js
 * ------------------
 * Current stock state per product per warehouse location.
 *
 * Associations (defined in models/index.js):
 *   Inventory.belongsTo(Product) → product_id FK
 *   Inventory.belongsTo(Vendor)  → vendor_id FK (primary replenishment vendor)
 *
 * The computed virtual `quantityAvailable` = on_hand - reserved,
 * giving the number of units actually free to commit to new orders.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../config/db.config');

class Inventory extends Model {}

Inventory.init(
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
    },
    vendorId: {
      type:      DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'vendors', key: 'id' },
    },
    warehouseLocation: {
      type:         DataTypes.STRING(100),
      allowNull:    false,
      defaultValue: 'DEFAULT',
      comment:      'Warehouse code or bin location',
    },

    // ── Stock counters
    quantityOnHand: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      validate:     { min: { args: [0], msg: 'Quantity on hand cannot be negative.' } },
      comment:      'Current physical stock count',
    },
    quantityReserved: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      validate:     { min: { args: [0], msg: 'Reserved quantity cannot be negative.' } },
      comment:      'Stock committed to open orders (soft lock)',
    },
    quantityOnOrder: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      validate:     { min: { args: [0], msg: 'On-order quantity cannot be negative.' } },
      comment:      'Quantity in transit from vendor',
    },

    // ── Threshold / policy fields
    safetyStockLevel: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Minimum buffer before alert is raised',
    },
    reorderPoint: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Level at which PO should be triggered',
    },
    reorderQuantity: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Standard order batch size (EOQ)',
    },

    lastRestockDate:  { type: DataTypes.DATEONLY, allowNull: true },
    nextRestockEta:   { type: DataTypes.DATEONLY, allowNull: true },

    // ── ⚡ OPTIMISTIC LOCKING VERSION COLUMN ───────────────────────
    // Every updateStock() call must supply the version the caller last read.
    // Repository executes:
    //   UPDATE inventory SET quantity_on_hand = ?, version = version + 1
    //   WHERE id = ? AND version = ?
    // If affectedRows === 0 → version stale → ConcurrentUpdateError (409).
    version: {
      type:         DataTypes.BIGINT.UNSIGNED,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Optimistic locking version — incremented on every stock update',
    },

    quantityAvailable: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.quantityOnHand - this.quantityReserved;
      },
    },

    // ── Alert flag: true when on_hand <= reorder_point
    isBelowReorderPoint: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.quantityOnHand <= this.reorderPoint;
      },
    },
  },
  {
    sequelize,
    modelName:       'Inventory',
    tableName:       'inventory',
    freezeTableName: true,
    indexes: [
      { unique: true, fields: ['product_id', 'warehouse_location'], name: 'uq_inventory_product_location' },
      { fields: ['vendor_id'] },
      { fields: ['quantity_on_hand', 'reorder_point'] },
    ],
  }
);

module.exports = Inventory;
