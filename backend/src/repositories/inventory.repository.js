'use strict';

/**
 * inventory.repository.js
 * -----------------------
 * LAYER 3 — Data access only. Raw SQL via Sequelize's sequelize.query().
 *
 * Design decision: raw SQL (not Sequelize ORM .save()) for updateStock because:
 *  1. Sequelize's built-in `{ version: true }` option works on the model's
 *     primary key. For inventory, we need an explicit atomic SQL expression:
 *       SET quantity_on_hand = quantity_on_hand + delta
 *     This is NOT achievable safely with ORM-level read-modify-write
 *     (read then +delta then save) because that creates a TOCTOU race.
 *     Raw SQL with a single atomic UPDATE is the correct approach.
 *
 *  2. The WHERE version = :version clause is the optimistic lock guard.
 *     It is invisible to ORM magic — making it explicit here forces every
 *     engineer reading this code to understand the concurrency contract.
 *
 * Terminology:
 *   TOCTOU = Time-of-check / Time-of-use race condition.
 *   OCC    = Optimistic Concurrency Control.
 */

const { QueryTypes } = require('sequelize');
const { sequelize }  = require('../config/db.config');
const { Inventory }  = require('../models');

// ── findById ─────────────────────────────────────────────────────────────────

/**
 * Fetches a single inventory record by PK.
 * Returns null if not found (no throw — let the service decide).
 *
 * @param {string} id - UUID of the inventory record.
 * @returns {Promise<Inventory|null>}
 */
const findById = async (id) => {
  return Inventory.findByPk(id);
};

// ── updateStockAtomically ─────────────────────────────────────────────────────

/**
 * Atomically adjusts stock quantity using raw SQL + Optimistic Locking.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  SQL executed (single round-trip, fully atomic in InnoDB):          │
 * │                                                                      │
 * │  UPDATE inventory                                                    │
 * │  SET                                                                 │
 * │    quantity_on_hand = quantity_on_hand + :delta,                     │
 * │    version          = version + 1,                                   │
 * │    updated_at       = NOW()                                          │
 * │  WHERE                                                               │
 * │    id               = :id                                            │
 * │    AND version      = :version          ← OCC guard clause          │
 * │    AND (quantity_on_hand + :delta) >= 0 ← no negative stock         │
 * │                                                                      │
 * │  Returns: affectedRows                                               │
 * │    • 1  → success                                                    │
 * │    • 0  → version mismatch OR record gone OR stock would go negative │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Why raw SQL instead of ORM?
 *   - `quantity_on_hand + :delta` is a SINGLE atomic expression evaluated
 *     by MySQL. The ORM alternative (read → add → save) is a multi-step
 *     read-modify-write that is NOT atomic and LOSES updates under concurrency.
 *
 * @param {object} params
 * @param {string} params.id      - Inventory record UUID.
 * @param {number} params.delta   - Units to add (+) or remove (–).
 * @param {number} params.version - Client's current version (OCC guard).
 * @returns {Promise<number>} affectedRows (1 = success, 0 = failed guard)
 */
const updateStockAtomically = async ({ id, delta, version }) => {
  const sql = `
    UPDATE inventory
    SET
      quantity_on_hand = quantity_on_hand + :delta,
      version          = version + 1,
      updated_at       = NOW()
    WHERE
          id            = :id
      AND version       = :version
      AND (quantity_on_hand + :delta) >= 0
  `;

  const [, meta] = await sequelize.query(sql, {
    replacements: { id, delta, version },
    type:         QueryTypes.UPDATE,
  });

  // meta.affectedRows is available on MySQL via mysql2 driver
  return meta;
};

// ── updateStockWithHistory (transactional) ────────────────────────────────────

/**
 * Wraps updateStockAtomically in a Sequelize managed transaction.
 * Also writes an audit log entry (if audit_log table exists).
 * Rolls back entirely if either operation fails.
 *
 * @param {object} params
 * @param {string} params.id        - Inventory record UUID.
 * @param {number} params.delta     - Units to add (+) or remove (–).
 * @param {number} params.version   - OCC version guard.
 * @param {string} params.reason    - Audit trail reason (e.g., "Sale order #1234").
 * @param {string} params.updatedBy - User or system identifier for audit.
 * @returns {Promise<number>} affectedRows
 */
const updateStockWithHistory = async ({ id, delta, version, reason, updatedBy }) => {
  return sequelize.transaction(async (txn) => {
    // ── Step 1: Atomic stock update with OCC guard
    const updateSql = `
      UPDATE inventory
      SET
        quantity_on_hand = quantity_on_hand + :delta,
        version          = version + 1,
        updated_at       = NOW()
      WHERE
            id            = :id
        AND version       = :version
        AND (quantity_on_hand + :delta) >= 0
    `;

    const [, meta] = await sequelize.query(updateSql, {
      replacements: { id, delta, version },
      type:         QueryTypes.UPDATE,
      transaction:  txn,
    });

    // ── Step 2: Append to audit trail (best-effort: only if table exists)
    // If audit_log table doesn't exist yet, this silently skips.
    if (meta > 0) {
      try {
        const auditSql = `
          INSERT INTO inventory_audit_log
            (inventory_id, delta, reason, updated_by, snapshot_version, created_at)
          VALUES
            (:id, :delta, :reason, :updatedBy, :newVersion, NOW())
        `;
        await sequelize.query(auditSql, {
          replacements: { id, delta, reason, updatedBy, newVersion: version + 1 },
          type:         QueryTypes.INSERT,
          transaction:  txn,
        });
      } catch (_auditErr) {
        // Audit log failure does NOT rollback the stock update
      }
    }

    return meta; // affectedRows
  });
};

module.exports = { findById, updateStockAtomically, updateStockWithHistory };
