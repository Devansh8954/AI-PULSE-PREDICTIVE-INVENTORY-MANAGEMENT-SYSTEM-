'use strict';

/**
 * inventory.service.js — LAYER 2 Business Logic
 * Full Optimistic Concurrency Control (OCC) implementation for updateStock().
 */

const { Inventory, Product, Vendor } = require('../models');
const { Op }                          = require('sequelize');
const InventoryRepository             = require('../repositories/inventory.repository');
const NotFoundError                   = require('../models/errors/NotFoundError');
const ConcurrentUpdateError           = require('../models/errors/ConcurrentUpdateError');
const AppError                        = require('../models/errors/AppError');
const logger                          = require('../utils/logger');

const MAX_DELTA_ABS = 10_000;

const validateUpdateStockInput = ({ delta, version }) => {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new AppError('delta must be a non-zero integer (positive to add, negative to remove stock).', 400);
  }
  if (Math.abs(delta) > MAX_DELTA_ABS) {
    throw new AppError(`|delta| cannot exceed ${MAX_DELTA_ABS.toLocaleString()} units per request.`, 400);
  }
  if (!Number.isInteger(version) || version < 0) {
    throw new AppError('version must be a non-negative integer echoed from the last GET response.', 400);
  }
};

const getInventoryById = async (id) => {
  const record = await InventoryRepository.findById(id);
  if (!record) throw new NotFoundError(`Inventory record '${id}' not found.`);
  return record;
};

/**
 * updateStock — Core OCC flow:
 *  1. Validate input (fail fast).
 *  2. Atomic SQL UPDATE WHERE version = :version (no lock held).
 *  3. If affectedRows = 0 → disambiguate: not found / negative stock / version conflict.
 *  4. Return updated record on success.
 *
 * @throws {AppError}               400 — bad delta or version
 * @throws {NotFoundError}          404 — record not found
 * @throws {ConcurrentUpdateError}  409 — OCC version mismatch
 * @throws {AppError}               409 — stock would go negative
 */
const updateStock = async ({ id, delta, version, reason = 'Manual adjustment', updatedBy = 'system' }) => {
  validateUpdateStockInput({ delta, version });

  logger.info(`[InventoryService.updateStock] id=${id} delta=${delta} version=${version} by=${updatedBy}`);

  const affectedRows = await InventoryRepository.updateStockWithHistory({
    id, delta, version, reason, updatedBy,
  });

  if (affectedRows === 0) {
    const current = await InventoryRepository.findById(id);

    if (!current) {
      throw new NotFoundError(`Inventory record '${id}' does not exist.`);
    }

    if (current.version === version) {
      const projectedQty = current.quantityOnHand + delta;
      if (projectedQty < 0) {
        throw new AppError(
          `Stock adjustment rejected: removing ${Math.abs(delta)} units would result in ` +
          `negative stock (current: ${current.quantityOnHand}). ` +
          `Maximum removable: ${current.quantityOnHand} units.`,
          409,
        );
      }
    }

    logger.warn(`[InventoryService.updateStock] OCC CONFLICT — id=${id} clientVersion=${version} dbVersion=${current.version}`);
    throw new ConcurrentUpdateError(id, version, `stock ${delta > 0 ? 'addition' : 'removal'} of ${Math.abs(delta)} units`);
  }

  const updated = await InventoryRepository.findById(id);
  logger.info(`[InventoryService.updateStock] SUCCESS — id=${id} newQty=${updated.quantityOnHand} newVersion=${updated.version}`);
  return updated;
};

/**
 * listInventory — paginated, with optional low-stock filter.
 */
const listInventory = async ({ page = 1, limit = 20, lowStock = false }) => {
  const offset     = (Math.max(1, page) - 1) * Math.min(limit, 100);
  const safeLimit  = Math.min(limit, 100);

  const { sequelize } = require('../config/db.config');

  const whereClause = lowStock
    ? { [Op.and]: [sequelize.literal('quantity_on_hand <= reorder_point')] }
    : {};

  const { rows: data, count: total } = await Inventory.findAndCountAll({
    where:    whereClause,
    include: [
      { model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'category'] },
      { model: Vendor,  as: 'vendor',  attributes: ['id', 'name', 'avgLeadDays'] },
    ],
    limit:    safeLimit,
    offset,
    subQuery: false,        // required when using include + limit/offset together
    order:    [['updatedAt', 'DESC']],
  });

  return { data, meta: { total, page, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) } };
};

module.exports = { getInventoryById, updateStock, listInventory };
