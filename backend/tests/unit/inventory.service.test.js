'use strict';

/**
 * inventory.service.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for InventoryService.updateStock() — the Optimistic Locking core.
 *
 * Test matrix:
 *   ✅ Happy path: valid delta + correct version → returns updated record
 *   ✅ OCC conflict: version mismatch → ConcurrentUpdateError (409)
 *   ✅ Record not found: affectedRows=0 + no record → NotFoundError (404)
 *   ✅ Stock negative: delta would make qty < 0 → AppError (409)
 *   ✅ Invalid delta: delta = 0 → AppError (400)
 *   ✅ Invalid version: version = -1 → AppError (400)
 */

jest.mock('../../src/repositories/inventory.repository');

const InventoryRepository   = require('../../src/repositories/inventory.repository');
const InventoryService      = require('../../src/services/inventory.service');
const ConcurrentUpdateError = require('../../src/models/errors/ConcurrentUpdateError');
const NotFoundError         = require('../../src/models/errors/NotFoundError');
const AppError              = require('../../src/models/errors/AppError');

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Simulates a DB record at version 3 with 40 units on hand. */
const makeInventoryRecord = (overrides = {}) => ({
  id:              'inv-uuid-001',
  productId:       'prod-uuid-001',
  quantityOnHand:  40,
  quantityReserved: 5,
  reorderPoint:    20,
  version:         3,
  ...overrides,
});

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('InventoryService.updateStock — Optimistic Locking', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── Input validation ───────────────────────────────────────────────────────

  it('should throw AppError(400) when delta is 0', async () => {
    await expect(InventoryService.updateStock({
      id: 'inv-uuid-001', delta: 0, version: 3,
    })).rejects.toMatchObject({ statusCode: 400, name: 'AppError' });
  });

  it('should throw AppError(400) when version is negative', async () => {
    await expect(InventoryService.updateStock({
      id: 'inv-uuid-001', delta: -5, version: -1,
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('should throw AppError(400) when delta is not an integer', async () => {
    await expect(InventoryService.updateStock({
      id: 'inv-uuid-001', delta: 2.5, version: 3,
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('should return updated record when version matches and stock is sufficient', async () => {
    const current = makeInventoryRecord();
    const updated = makeInventoryRecord({ quantityOnHand: 35, version: 4 }); // after -5

    InventoryRepository.updateStockWithHistory.mockResolvedValue(1);  // affectedRows = 1
    InventoryRepository.findById.mockResolvedValue(updated);

    const result = await InventoryService.updateStock({
      id: 'inv-uuid-001', delta: -5, version: 3, reason: 'Sale order #42',
    });

    expect(InventoryRepository.updateStockWithHistory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'inv-uuid-001', delta: -5, version: 3 })
    );
    expect(result.quantityOnHand).toBe(35);
    expect(result.version).toBe(4);
  });

  // ── OCC Conflict ───────────────────────────────────────────────────────────

  it('should throw ConcurrentUpdateError(409) when version is stale', async () => {
    // Simulate: DB is at version 4 (someone else updated), client sends version 3
    const dbRecord = makeInventoryRecord({ version: 4, quantityOnHand: 35 });

    InventoryRepository.updateStockWithHistory.mockResolvedValue(0);  // affectedRows = 0
    InventoryRepository.findById.mockResolvedValue(dbRecord);          // record exists, version differs

    await expect(InventoryService.updateStock({
      id: 'inv-uuid-001', delta: -5, version: 3,  // stale version
    })).rejects.toBeInstanceOf(ConcurrentUpdateError);

    // Verify error carries diagnostic context
    await expect(InventoryService.updateStock({
      id: 'inv-uuid-001', delta: -5, version: 3,
    })).rejects.toMatchObject({
      statusCode: 409,
      name:       'ConcurrentUpdateError',
      context: expect.objectContaining({
        inventoryId:   'inv-uuid-001',
        clientVersion: 3,
      }),
    });
  });

  it('ConcurrentUpdateError should have isOperational = true', async () => {
    const err = new ConcurrentUpdateError('inv-uuid-001', 3, 'test');
    expect(err.isOperational).toBe(true);
    expect(err.statusCode).toBe(409);
    expect(err.context.inventoryId).toBe('inv-uuid-001');
    expect(err.context.clientVersion).toBe(3);
  });

  // ── Record not found ───────────────────────────────────────────────────────

  it('should throw NotFoundError(404) when inventory record does not exist', async () => {
    InventoryRepository.updateStockWithHistory.mockResolvedValue(0); // affectedRows = 0
    InventoryRepository.findById.mockResolvedValue(null);             // record gone

    await expect(InventoryService.updateStock({
      id: 'non-existent-id', delta: -5, version: 0,
    })).rejects.toBeInstanceOf(NotFoundError);
  });

  // ── Stock would go negative ────────────────────────────────────────────────

  it('should throw AppError(409) when removal would make stock negative', async () => {
    // Record has 10 units, client tries to remove 20
    const dbRecord = makeInventoryRecord({ quantityOnHand: 10, version: 3 });

    InventoryRepository.updateStockWithHistory.mockResolvedValue(0); // MySQL WHERE guard fired
    InventoryRepository.findById.mockResolvedValue(dbRecord);         // record exists, version matches

    await expect(InventoryService.updateStock({
      id: 'inv-uuid-001', delta: -20, version: 3,  // -20 > available 10
    })).rejects.toMatchObject({
      statusCode: 409,
      message:    expect.stringContaining('negative stock'),
    });
  });

  // ── Concurrent scenario simulation ─────────────────────────────────────────

  it('simulates 2 concurrent writers — second one should get ConcurrentUpdateError', async () => {
    // Both writers read version 3
    // Writer A succeeds → advances to version 4
    // Writer B has affectedRows=0 because version=3 no longer matches DB (now 4)

    const dbAfterWriterA = makeInventoryRecord({ quantityOnHand: 35, version: 4 });

    // Writer A succeeds
    InventoryRepository.updateStockWithHistory.mockResolvedValueOnce(1);
    InventoryRepository.findById.mockResolvedValueOnce(dbAfterWriterA);

    const writerAResult = await InventoryService.updateStock({
      id: 'inv-uuid-001', delta: -5, version: 3,
    });
    expect(writerAResult.version).toBe(4); // advanced to 4

    // Writer B fails — version 3 is now stale
    InventoryRepository.updateStockWithHistory.mockResolvedValueOnce(0);
    InventoryRepository.findById.mockResolvedValueOnce(dbAfterWriterA); // DB at version 4

    await expect(InventoryService.updateStock({
      id: 'inv-uuid-001', delta: -5, version: 3, // still sending stale version
    })).rejects.toBeInstanceOf(ConcurrentUpdateError);
  });
});
