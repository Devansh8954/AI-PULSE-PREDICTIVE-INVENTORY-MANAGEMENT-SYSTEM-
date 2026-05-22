'use strict';

/**
 * purchaseOrder.model.js
 * ----------------------
 * Tracks purchase orders raised by managers to replenish stock.
 *
 * Associations (defined in models/index.js):
 *   PurchaseOrder.belongsTo(Vendor)   → vendor_id FK
 *   PurchaseOrder.belongsTo(User)     → created_by FK (manager who raised it)
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../config/db.config');

class PurchaseOrder extends Model {}

PurchaseOrder.init(
  {
    id: {
      type:         DataTypes.CHAR(36),
      primaryKey:   true,
      defaultValue: DataTypes.UUIDV4,
      allowNull:    false,
    },

    // Human-readable PO number e.g. PO-2024-001
    poNumber: {
      type:      DataTypes.STRING(50),
      allowNull: false,
      unique:    true,
      comment:   'Auto-generated sequential PO identifier',
    },

    vendorId: {
      type:      DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'vendors', key: 'id' },
    },

    // Items: array of { productId, quantity, unitCost } stored as JSON
    lineItems: {
      type:      DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment:   'Array of { productId, quantity, unitCost }',
    },

    totalUnits: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      validate:     { min: { args: [1], msg: 'Total units must be at least 1.' } },
    },

    totalCost: {
      type:         DataTypes.DECIMAL(14, 2),
      allowNull:    false,
      defaultValue: 0,
    },

    status: {
      type:         DataTypes.ENUM('PENDING', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED'),
      allowNull:    false,
      defaultValue: 'PENDING',
    },

    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    expectedDeliveryDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },

    createdBy: {
      type:      DataTypes.CHAR(36),
      allowNull: true,
      references: { model: 'users', key: 'id' },
      comment:   'Manager who raised the PO',
    },
  },
  {
    sequelize,
    modelName:       'PurchaseOrder',
    tableName:       'purchase_orders',
    freezeTableName: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['vendor_id'] },
      { fields: ['created_at'] },
    ],
  },
);

module.exports = PurchaseOrder;
