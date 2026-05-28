'use strict';

/**
 * product.service.test.js
 * -----------------------
 * Unit tests for ProductService.
 * All Sequelize model calls are mocked — no live DB required.
 *
 * Tests cover:
 *  - getProductById → NotFoundError when product is null
 *  - getProductById → returns product when found
 *  - updateProduct  → throws ConflictError on OptimisticLockError
 *  - updateProduct  → returns updated product on success
 */

jest.mock('../../src/models', () => ({
  Product:   { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  Inventory: {},
  Vendor:    {},
}));

const { Product } = require('../../src/models');
const ProductService = require('../../src/services/product.service');
const NotFoundError  = require('../../src/models/errors/NotFoundError');
const ConflictError  = require('../../src/models/errors/ConflictError');

describe('ProductService', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── getProductById ────────────────────────────────────────────────────────

  describe('getProductById', () => {
    it('should throw NotFoundError when product does not exist', async () => {
      Product.findOne.mockResolvedValue(null);

      await expect(ProductService.getProductById('non-existent-id'))
        .rejects.toThrow(NotFoundError);
    });

    it('should return the product when it exists', async () => {
      const mockProduct = { id: 'abc-123', name: 'UltraBook Pro', version: 2 };
      Product.findOne.mockResolvedValue(mockProduct);

      const result = await ProductService.getProductById('abc-123');
      expect(result).toEqual(mockProduct);
      expect(Product.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'abc-123', isActive: true } }),
      );
    });
  });

  // ── updateProduct (Optimistic Lock) ───────────────────────────────────────

  describe('updateProduct — Optimistic Locking', () => {
    it('should throw ConflictError when SequelizeOptimisticLockError is raised', async () => {
      const mockProduct = {
        id: 'abc-123', name: 'Old Name', version: 1,
        save: jest.fn().mockRejectedValue({ name: 'SequelizeOptimisticLockError' }),
      };
      Product.findOne.mockResolvedValue(mockProduct);

      await expect(
        ProductService.updateProduct('abc-123', { name: 'New Name', version: 0 }),
      ).rejects.toThrow(ConflictError);
    });

    it('should return updated product on successful save', async () => {
      const mockProduct = {
        id: 'abc-123', name: 'Old Name', category: 'ELECTRONICS', unitPrice: 75999, version: 2,
        save: jest.fn().mockResolvedValue(true),
      };
      Product.findOne.mockResolvedValue(mockProduct);

      const _result = await ProductService.updateProduct('abc-123', {
        name: 'New Name', version: 2,
      });

      expect(mockProduct.save).toHaveBeenCalled();
      expect(mockProduct.name).toBe('New Name');
    });
  });

});
