'use strict';

/**
 * vendor.model.js
 * ---------------
 * Represents the `vendors` table.
 * A vendor has a computed reliability tier (GOLD / SILVER / AT_RISK)
 * derived from total_deliveries and on_time_deliveries.
 * The virtual field `reliabilityPct` is a Sequelize VIRTUAL — computed
 * client-side on each SELECT, never stored in the DB.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../config/db.config');

class Vendor extends Model {
  /**
   * Returns a tier label based on reliability percentage.
   * Called in serialisation / frontend display.
   */
  get reliabilityTier() {
    const pct = this.reliabilityPct;
    if (pct === null) return 'UNRATED';
    if (pct >= 90)   return 'GOLD';
    if (pct >= 75)   return 'SILVER';
    return 'AT_RISK';
  }
}

Vendor.init(
  {
    id: {
      type:         DataTypes.CHAR(36),
      primaryKey:   true,
      defaultValue: DataTypes.UUIDV4,
      allowNull:    false,
    },
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      validate:  { notEmpty: { msg: 'Vendor name cannot be empty.' } },
    },
    contactEmail: {
      type:      DataTypes.STRING(320),
      allowNull: false,
      unique:    { name: 'uq_vendor_email', msg: 'Email already registered.' },
      validate:  { isEmail: { msg: 'Must be a valid email address.' } },
    },
    contactPhone: {
      type:      DataTypes.STRING(20),
      allowNull: true,
    },
    address: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    totalDeliveries: {
      type:         DataTypes.INTEGER.UNSIGNED,
      allowNull:    false,
      defaultValue: 0,
    },
    onTimeDeliveries: {
      type:         DataTypes.INTEGER.UNSIGNED,
      allowNull:    false,
      defaultValue: 0,
    },
    avgLeadDays: {
      type:         DataTypes.DECIMAL(5, 2),
      allowNull:    false,
      defaultValue: 0.00,
      comment:      'Rolling average lead time in days',
    },

    // ── Computed virtual field (not stored in DB)
    reliabilityPct: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.totalDeliveries === 0) return null;
        return parseFloat(
          ((this.onTimeDeliveries / this.totalDeliveries) * 100).toFixed(2),
        );
      },
    },

    isActive: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName:       'Vendor',
    tableName:       'vendors',
    freezeTableName: true,
    indexes: [{ fields: ['is_active'] }],
  },
);

module.exports = Vendor;
