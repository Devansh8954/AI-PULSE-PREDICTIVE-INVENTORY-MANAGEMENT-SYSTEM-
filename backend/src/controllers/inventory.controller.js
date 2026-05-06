'use strict';

/**
 * inventory.controller.js
 * -----------------------
 * LAYER 1 — HTTP only.
 * Routes inventory requests to InventoryService and formats responses.
 *
 * PATCH /:id/adjust — the key endpoint exercising Optimistic Locking.
 * Request body: { delta: number, version: number, reason?: string }
 *
 * Error mapping (all handled by errorHandler.middleware):
 *   400 → AppError        (bad delta/version)
 *   404 → NotFoundError   (record gone)
 *   409 → ConcurrentUpdateError  (OCC conflict — re-fetch and retry)
 *   409 → AppError        (stock would go negative)
 */

const InventoryService = require('../services/inventory.service');

const listInventory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, lowStock } = req.query;
    const result = await InventoryService.listInventory({
      page: Number(page), limit: Number(limit), lowStock: lowStock === 'true',
    });
    return res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getInventoryById = async (req, res, next) => {
  try {
    const record = await InventoryService.getInventoryById(req.params.id);
    return res.status(200).json({ success: true, data: record });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/v1/inventory/:id/adjust
 *
 * Adjust stock quantity using Optimistic Locking.
 * The caller MUST include the `version` they last read.
 *
 * Request body:
 *   {
 *     "delta":   -5,                        // negative = removal, positive = addition
 *     "version": 3,                         // ⚡ OCC version guard — from last GET
 *     "reason":  "Sale order #SO-8821"      // optional audit trail
 *   }
 *
 * Success response (200):
 *   { "success": true, "data": { ...updatedInventory } }
 *
 * Conflict response (409) — re-fetch and retry:
 *   {
 *     "success": false,
 *     "error": {
 *       "code":    "ConcurrentUpdateError",
 *       "message": "Optimistic lock conflict on inventory '...'",
 *       "context": { "inventoryId": "...", "clientVersion": 3, "action": "..." }
 *     }
 *   }
 */
const adjustStock = async (req, res, next) => {
  try {
    const { delta, version, reason } = req.body;
    const updatedBy = req.user?.id ?? 'anonymous'; // from auth.middleware JWT payload

    const updated = await InventoryService.updateStock({
      id: req.params.id,
      delta:     Number(delta),
      version:   Number(version),
      reason,
      updatedBy,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) { next(err); }
};

module.exports = { listInventory, getInventoryById, adjustStock };
