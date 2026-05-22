'use strict';

/**
 * product.service.js
 * ------------------
 * LAYER 2 — Business Logic.
 *
 * Responsibilities:
 *  - Enforce business rules (e.g., SKU uniqueness beyond DB constraint).
 *  - Orchestrate multi-model queries.
 *  - Throw domain-specific errors (NotFoundError, ConflictError).
 *  - Never touch HTTP concepts (req / res / status codes).
 *
 * Clean Code principles applied:
 *  - Single Responsibility: each method does one thing.
 *  - Descriptive names: getInventoryByProductId vs getProduct.
 *  - Guard clauses: early throws instead of nested if/else.
 *  - No magic numbers: constants extracted at the top.
 */

const { Op }           = require('sequelize');
const { Product, Inventory, Vendor } = require('../models');
const NotFoundError    = require('../models/errors/NotFoundError');
const ConflictError    = require('../models/errors/ConflictError');

// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

// ── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Builds a Sequelize-safe pagination object.
 * Clamps limit to MAX_LIMIT to prevent runaway queries.
 */
const buildPagination = (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  const safePage  = Math.max(1, parseInt(page, 10));
  const safeLimit = Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  return { offset: (safePage - 1) * safeLimit, limit: safeLimit, page: safePage };
};

/**
 * Asserts a record exists; throws NotFoundError if null.
 */
const assertExists = (record, resourceName, id) => {
  if (!record) throw new NotFoundError(`${resourceName} with id '${id}' was not found.`);
};

// ── Service Methods ──────────────────────────────────────────────────────────

/**
 * Returns a paginated list of active products with optional category filter.
 */
const listProducts = async ({ page, limit, category }) => {
  const { offset, limit: take, page: currentPage } = buildPagination(page, limit);

  const whereClause = { isActive: true };
  if (category) whereClause.category = category;

  const { rows: data, count: total } = await Product.findAndCountAll({
    where:      whereClause,
    limit:      take,
    offset,
    order:      [['createdAt', 'DESC']],
    attributes: { exclude: ['deletedAt'] },
  });

  return {
    data,
    meta: {
      total,
      page:       currentPage,
      limit:      take,
      totalPages: Math.ceil(total / take),
    },
  };
};

/**
 * Returns a single product by PK.
 * Throws NotFoundError if not found or soft-deleted.
 */
const getProductById = async (id) => {
  const product = await Product.findOne({
    where: { id, isActive: true },
  });
  assertExists(product, 'Product', id);
  return product;
};

/**
 * Creates a new product.
 * Sequelize's unique constraint on SKU will throw a UniqueConstraintError
 * if the SKU already exists — that is caught in the controller and mapped to 409.
 */
const createProduct = async (dto) => {
  return Product.create(dto);
};

/**
 * Updates a product using Sequelize's built-in Optimistic Locking.
 *
 * Flow:
 *  1. Fetch product instance (with current version from DB).
 *  2. Apply dto fields to the instance.
 *  3. Call instance.save() — Sequelize automatically appends
 *     WHERE version = <current> to the UPDATE and increments version.
 *  4. If the WHERE clause matches 0 rows (stale version), Sequelize
 *     throws OptimisticLockError. We catch it → ConflictError → HTTP 409.
 *
 * @throws {NotFoundError}  if product does not exist.
 * @throws {ConflictError}  if a concurrent update was detected (OptimisticLockError).
 */
const updateProduct = async (id, dto) => {
  const product = await getProductById(id);

  // Set fields from DTO (only allowed fields — no spreading to prevent mass assignment)
  const UPDATABLE_FIELDS = ['name', 'description', 'category', 'brand', 'unitPrice', 'unitOfMeasure'];
  UPDATABLE_FIELDS.forEach((field) => {
    if (dto[field] !== undefined) product[field] = dto[field];
  });

  // Override version with client-supplied version so Sequelize's lock check fires
  product.version = dto.version;

  try {
    await product.save();
    return product;
  } catch (err) {
    // Sequelize throws OptimisticLockError when version mismatch is detected
    if (err.name === 'SequelizeOptimisticLockError') {
      throw new ConflictError(
        'Stale version detected — the product was modified by another request. Re-fetch and retry.',
      );
    }
    throw err;
  }
};

/**
 * Soft-deletes a product (sets isActive = false AND sets deletedAt via paranoid).
 * @throws {NotFoundError} if product does not exist.
 */
const deleteProduct = async (id) => {
  const product = await getProductById(id);
  product.isActive = false;
  await product.save();
  await product.destroy();  // sets deletedAt (paranoid soft-delete)
};

/**
 * Returns full inventory details for a product, joining Inventory + Vendor.
 * This is the "getInventory" core business logic — used by the controller
 * method of the same name.
 *
 * @param {string} productId - UUID of the product.
 * @returns {object} Product + array of inventory records (with vendor details).
 * @throws {NotFoundError} if the product does not exist.
 */
const getInventoryByProductId = async (productId) => {
  const product = await Product.findOne({
    where: { id: productId, isActive: true },
    include: [
      {
        model:   Inventory,
        as:      'inventoryRecords',
        include: [
          {
            model:      Vendor,
            as:         'vendor',
            // Only expose vendor fields relevant to inventory context
            attributes: ['id', 'name', 'contactEmail', 'avgLeadDays', 'reliabilityPct'],
          },
        ],
      },
    ],
    attributes: { exclude: ['deletedAt'] },
  });

  assertExists(product, 'Product', productId);
  return product;
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventoryByProductId,
};
