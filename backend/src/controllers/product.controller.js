'use strict';

/**
 * product.controller.js
 * ---------------------
 * LAYER 1 — HTTP concerns only.
 *
 * Responsibilities:
 *  ✅ Parse and validate HTTP request inputs.
 *  ✅ Call the appropriate service method.
 *  ✅ Map service result → HTTP response (status code + JSON body).
 *  ✅ Forward any error to next() for the centralized errorHandler.
 *
 *  ❌ No SQL.
 *  ❌ No business rules.
 *  ❌ No direct model access.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * getInventory (key method)
 * ─────────────────────────
 * GET /api/v1/products/:id/inventory
 *
 * Returns a product with ALL its inventory records joined, each carrying
 * the assigned vendor's name, email, avg lead time, and reliability score.
 *
 * The SQL Sequelize generates is equivalent to:
 *   SELECT p.*, i.*, v.name, v.contact_email, v.avg_lead_days
 *   FROM   products  p
 *   JOIN   inventory i ON i.product_id = p.id
 *   JOIN   vendors   v ON v.id = i.vendor_id
 *   WHERE  p.id = :productId AND p.is_active = 1;
 *
 * Response example:
 *   {
 *     "success": true,
 *     "data": {
 *       "id":       "aaaa0001-...",
 *       "sku":      "ELEC-LPT-001",
 *       "name":     "UltraBook Pro 15",
 *       "version":  3,
 *       "inventoryRecords": [
 *         {
 *           "id":                "inv00001-...",
 *           "warehouseLocation": "WH-DELHI-01",
 *           "quantityOnHand":    45,
 *           "quantityAvailable": 40,      ← virtual field
 *           "isBelowReorderPoint": false, ← virtual field
 *           "vendor": { "name": "TechSupply Co.", "avgLeadDays": 4.5, ... }
 *         }
 *       ]
 *     }
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ProductService = require('../services/product.service');

// ── List all products (paginated) ────────────────────────────────────────────
const listProducts = async (req, res, next) => {
  try {
    const { page, limit, category } = req.query;
    const result = await ProductService.listProducts({ page, limit, category });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// ── Get a single product by ID ───────────────────────────────────────────────
const getProductById = async (req, res, next) => {
  try {
    const product = await ProductService.getProductById(req.params.id);
    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ── Create a new product ─────────────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const product = await ProductService.createProduct(req.body);
    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ── Update product (Optimistic Locking enforced in service) ─────────────────
// Client MUST send the `version` field in the request body.
// If the version is stale → service throws ConflictError → errorHandler → 409.
const updateProduct = async (req, res, next) => {
  try {
    const updated = await ProductService.updateProduct(req.params.id, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── Soft-delete a product ────────────────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    await ProductService.deleteProduct(req.params.id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/products/:id/inventory ───────────────────────────────────────
/**
 * getInventory
 * Fetches a product joined with its inventory records and each record's vendor.
 * Demonstrates a 3-table JOIN via Sequelize eager loading (include).
 *
 * HTTP 200 — product found with inventory.
 * HTTP 404 — product not found (via NotFoundError in service).
 */
const getInventory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await ProductService.getInventoryByProductId(id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventory,       // ← the key method
};
