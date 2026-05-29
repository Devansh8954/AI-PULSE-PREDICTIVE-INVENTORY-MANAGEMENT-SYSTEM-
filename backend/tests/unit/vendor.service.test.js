'use strict';

/**
 * vendor.service.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for VendorService.
 * All Sequelize model calls are mocked — no live DB required.
 *
 * Tests cover:
 *   ✅ listVendors → returns array of vendor records
 *   ✅ createVendor → returns created vendor
 */

jest.mock('../../src/models', () => ({
  Vendor: {
    findAndCountAll: jest.fn(),
    create:          jest.fn(),
    findOne:         jest.fn(),
  },
  Product:     {},
  Inventory:   {},
  TrendSignal: {},
}));

const { Vendor }     = require('../../src/models');
const VendorService  = require('../../src/services/vendor.service');

const MOCK_VENDORS = [
  { id: 'v-001', name: 'TechParts Ltd',    avgLeadDays: 3.5, reliabilityPct: 98.2 },
  { id: 'v-002', name: 'GlobalSupply Co',  avgLeadDays: 7.0, reliabilityPct: 75.0 },
];

describe('VendorService', () => {

  beforeEach(() => jest.clearAllMocks());

  describe('listVendors', () => {
    it('should return paginated vendors from the database', async () => {
      Vendor.findAndCountAll.mockResolvedValue({ rows: MOCK_VENDORS, count: 2 });

      const result = await VendorService.listVendors({});

      expect(Vendor.findAndCountAll).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('TechParts Ltd');
      expect(result.meta.total).toBe(2);
    });

    it('should return empty data array when no vendors exist', async () => {
      Vendor.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const result = await VendorService.listVendors({});
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('createVendor', () => {
    it('should create and return a new vendor', async () => {
      const dto = { name: 'NewVendor Inc', contactEmail: 'vendor@new.com', avgLeadDays: 5 };
      const created = { id: 'v-003', ...dto };
      Vendor.create.mockResolvedValue(created);

      const result = await VendorService.createVendor(dto);

      expect(Vendor.create).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('v-003');
      expect(result.name).toBe('NewVendor Inc');
    });
  });
});
