'use strict';

const AppError = require('./AppError');

/**
 * ConcurrentUpdateError — HTTP 409
 * ───────────────────────────────────────────────────────────────────────────
 * Thrown exclusively by the Optimistic Locking guard in updateStock().
 *
 * Root cause: two agents (warehouse scanners, web clients, batch jobs)
 * read the SAME inventory record at version N, and both attempt to write.
 * The first writer succeeds and advances the version to N+1.
 * The second writer's WHERE version = N matches 0 rows → this error.
 *
 * Client contract:
 *   HTTP 409 Conflict
 *   {
 *     "success": false,
 *     "error": {
 *       "code":    "CONCURRENT_UPDATE_CONFLICT",
 *       "message": "...",
 *       "context": { "inventoryId": "...", "clientVersion": N, "action": "..." }
 *     }
 *   }
 *
 * Resolution: client must GET the inventory record again (gets version N+1),
 * recalculate its intended delta, and resubmit the PATCH request.
 *
 * Why NOT a generic ConflictError?
 *  - ConcurrentUpdateError carries typed context (inventoryId, clientVersion)
 *    so monitoring dashboards can alert on OCC collision rates per product.
 *  - Separating it from ConflictError (used for FK/duplicate-key violations)
 *    makes error handling in the controller explicit and testable.
 */
class ConcurrentUpdateError extends AppError {
  /**
   * @param {string} inventoryId   - The inventory record that was contested.
   * @param {number} clientVersion - The stale version the client sent.
   * @param {string} [action]      - Description of the attempted operation.
   */
  constructor(inventoryId, clientVersion, action = 'stock adjustment') {
    super(
      `Optimistic lock conflict on inventory '${inventoryId}'. ` +
      `Version ${clientVersion} is stale — another agent updated this record first. ` +
      'Re-fetch and retry.',
      409,
    );
    this.name    = 'ConcurrentUpdateError';
    this.context = { inventoryId, clientVersion, action };
  }
}

module.exports = ConcurrentUpdateError;
