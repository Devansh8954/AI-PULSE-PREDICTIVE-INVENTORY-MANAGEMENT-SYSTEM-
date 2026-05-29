'use strict';

/**
 * vendor.repository.js
 * --------------------
 * LAYER 3 — Data access only.
 * All Vendor queries are centralised here, keeping the service free of
 * Sequelize model references and making the layer independently testable.
 */

const { Vendor } = require('../models');

/**
 * Returns paginated active vendors ordered by name.
 * @param {{ limit: number, offset: number }} options
 * @returns {Promise<{ rows: Vendor[], count: number }>}
 */
const findAll = ({ limit = 20, offset = 0 } = {}) =>
  Vendor.findAndCountAll({
    where:  { isActive: true },
    order:  [['name', 'ASC']],
    limit,
    offset,
  });

/**
 * Returns a single active vendor by PK.
 * Returns null if not found (service decides how to handle it).
 * @param {string} id - Vendor UUID.
 * @returns {Promise<Vendor|null>}
 */
const findById = (id) =>
  Vendor.findOne({ where: { id, isActive: true } });

/**
 * Creates a new vendor record.
 * @param {object} dto - Validated vendor data.
 * @returns {Promise<Vendor>}
 */
const create = (dto) => Vendor.create(dto);

module.exports = { findAll, findById, create };
