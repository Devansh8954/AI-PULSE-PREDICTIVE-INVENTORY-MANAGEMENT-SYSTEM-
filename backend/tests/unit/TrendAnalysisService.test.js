'use strict';

/**
 * TrendAnalysisService.test.js
 * ----------------------------
 * Unit tests for TrendAnalysisService.
 * All external dependencies (Gemini AI, Sequelize models) are fully mocked.
 * No live DB or API key required.
 */

// ── Mock the Gemini SDK ────────────────────────────────────────────────────
const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// ── Mock Sequelize models ──────────────────────────────────────────────────
jest.mock('../../src/models', () => ({
  Product:     { findAll: jest.fn() },
  Inventory:   {},
  TrendSignal: { upsert: jest.fn() },
}));

const { Product, TrendSignal } = require('../../src/models');
const TrendAnalysisService     = require('../../src/services/TrendAnalysisService');
const AppError                 = require('../../src/errors/AppError');

// ── Helpers ────────────────────────────────────────────────────────────────

const makeGeminiResponse = (products) => ({
  response: { text: () => JSON.stringify(products) },
});

const MOCK_AI_PRODUCTS = [
  { sku: 'HOME-HTR-001', productName: 'Portable Heater', category: 'HOME',       trendScore: 0.95, reason: 'Cold season demand' },
  { sku: 'CLTH-JKT-002', productName: 'Winter Jacket',   category: 'CLOTHING',   trendScore: 0.88, reason: 'Winter apparel spike' },
  { sku: 'GROC-TEA-003', productName: 'Herbal Tea Pack',  category: 'GROCERY',    trendScore: 0.72, reason: 'Warm beverage trend' },
];

const MOCK_DB_PRODUCTS = [
  {
    id:  'prod-uuid-001',
    sku: 'HOME-HTR-001',
    name: 'Portable Heater',
    inventoryRecords: [{ quantityOnHand: 12, quantityReserved: 0, reorderPoint: 20 }],  // LOW STOCK
  },
  {
    id:  'prod-uuid-002',
    sku: 'CLTH-JKT-002',
    name: 'Winter Jacket',
    inventoryRecords: [{ quantityOnHand: 200, quantityReserved: 10, reorderPoint: 30 }], // ADEQUATE
  },
  // GROC-TEA-003 not in DB → NOT_IN_CATALOG
];

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TrendAnalysisService.analyzeKeyword', () => {

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-api-key-mock';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent.mockResolvedValue(makeGeminiResponse(MOCK_AI_PRODUCTS));
    Product.findAll.mockResolvedValue(MOCK_DB_PRODUCTS);
    TrendSignal.upsert.mockResolvedValue([{ id: 'signal-uuid' }, true]);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it('should throw AppError(400) for an empty keyword', async () => {
    await expect(TrendAnalysisService.analyzeKeyword(''))
      .rejects.toThrow(AppError);
    await expect(TrendAnalysisService.analyzeKeyword(''))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('should throw AppError(503) when GEMINI_API_KEY is missing', async () => {
    const key = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await expect(TrendAnalysisService.analyzeKeyword('Winter coming'))
      .rejects.toMatchObject({ statusCode: 503 });

    process.env.GEMINI_API_KEY = key;
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('should return a report with correct summary counts', async () => {
    const report = await TrendAnalysisService.analyzeKeyword('Winter coming');

    expect(report.keyword).toBe('Winter coming');
    expect(report.summary.totalTrending).toBe(3);
    expect(report.summary.lowStockAlerts).toBe(1);   // only HOME-HTR-001 (onHand=12 < 50)
    expect(report.summary.adequate).toBe(1);          // CLTH-JKT-002 (onHand=200)
    expect(report.summary.notInCatalog).toBe(1);      // GROC-TEA-003 not found
    expect(report.summary.signalsWritten).toBe(1);
  });

  it('should call TrendSignal.upsert ONLY for low-stock items', async () => {
    await TrendAnalysisService.analyzeKeyword('Winter coming');

    // Only HOME-HTR-001 is low-stock → exactly 1 upsert
    expect(TrendSignal.upsert).toHaveBeenCalledTimes(1);
    expect(TrendSignal.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        productId:    'prod-uuid-001',
        signalSource: 'GEMINI_AI',
        signalType:   'DEMAND_SPIKE',
        keyword:      'Winter coming',
      }),
      expect.any(Object),
    );
  });

  it('should throw AppError(502) when Gemini returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Sorry, I cannot help with that.' },
    });

    await expect(TrendAnalysisService.analyzeKeyword('Winter coming'))
      .rejects.toMatchObject({ statusCode: 502 });
  });

  it('should write 0 signals when all items are adequately stocked', async () => {
    Product.findAll.mockResolvedValue([
      {
        id: 'prod-uuid-002', sku: 'HOME-HTR-001', name: 'Portable Heater',
        inventoryRecords: [{ quantityOnHand: 999, quantityReserved: 0, reorderPoint: 20 }],
      },
    ]);

    const report = await TrendAnalysisService.analyzeKeyword('Summer heat');
    expect(report.summary.signalsWritten).toBe(0);
    expect(TrendSignal.upsert).not.toHaveBeenCalled();
  });
});
