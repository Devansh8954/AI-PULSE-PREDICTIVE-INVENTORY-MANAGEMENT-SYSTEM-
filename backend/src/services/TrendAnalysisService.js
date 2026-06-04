'use strict';

/**
 * TrendAnalysisService.js
 * ========================
 * Orchestrates AI-powered demand trend analysis and syncs results
 * back to the database, updating trend signals for low-stock items.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                      EXECUTION FLOW                            │
 * │                                                                 │
 * │  analyzeKeyword(keyword)                                        │
 * │        │                                                        │
 * │        ▼                                                        │
 * │  1. callGeminiAI(keyword)                                       │
 * │     → Sends structured prompt to Google Gemini API             │
 * │     → Parses JSON: [{ sku, name, trendScore, reason }]          │
 * │        │                                                        │
 * │        ▼                                                        │
 * │  2. crossReferenceInventory(trendingProducts)                   │
 * │     → For each trending product, looks up inventory by SKU      │
 * │     → Tags as LOW_STOCK if quantityOnHand < RESTOCK_THRESHOLD   │
 * │        │                                                        │
 * │        ▼                                                        │
 * │  3. persistTrendSignals(matches, keyword)                       │
 * │     → If LOW_STOCK + Trending → upsert trend_signals row        │
 * │     → Updates signal_score with AI-predicted trendScore         │
 * │        │                                                        │
 * │        ▼                                                        │
 * │  4. Returns structured analysis report                          │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * SECURITY: API keys are NEVER hardcoded. Loaded exclusively from
 * process.env via dotenv. See .env.example for required variables.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Op }                        = require('sequelize');
const { Product, Inventory, TrendSignal } = require('../models');
const logger                 = require('../utils/logger');
const AppError               = require('../errors/AppError');

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Stock threshold below which an item is considered "at risk".
 * If AI also flags this SKU as trending → trend_signal is written/updated.
 * Configurable via environment variable for flexibility.
 */
const RESTOCK_THRESHOLD = Number(process.env.TREND_RESTOCK_THRESHOLD) || 50;

/**
 * Number of days a trend signal remains active before expiry.
 * After this, the forecasting engine ignores it.
 */
const SIGNAL_TTL_DAYS = Number(process.env.TREND_SIGNAL_TTL_DAYS) || 7;

/**
 * Weight multiplier assigned to AI-generated signals.
 * Higher than manual signals (1.0) because AI analyses are data-driven.
 */
const AI_SIGNAL_WEIGHT = 1.8;

// ── Private: Gemini AI Client ─────────────────────────────────────────────────

/**
 * Returns an initialized GoogleGenerativeAI client.
 * Validates that the API key exists at call time (not at module load)
 * so the server can still boot without the key — only trend analysis fails.
 *
 * @throws {AppError} 503 if GEMINI_API_KEY is missing.
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      'GEMINI_API_KEY is not configured. Add it to your .env file. See .env.example.',
      503,
    );
  }
  return new GoogleGenerativeAI(apiKey);
};

// ── Private: Build the AI prompt ──────────────────────────────────────────────

/**
 * Constructs a strict, structured prompt that instructs Gemini to return
 * ONLY valid JSON — no markdown, no prose, no code fences.
 * Strict JSON-only response avoids fragile regex parsing.
 *
 * @param {string} keyword - The trend keyword to analyze (e.g., "Winter coming").
 * @returns {string} The fully assembled prompt string.
 */
const buildTrendPrompt = (keyword) => `
You are an expert retail demand forecasting AI embedded in an inventory management system.

Analyze the following consumer trend keyword and identify which product categories and 
specific product SKUs are likely to experience a significant demand spike.

Trend keyword: "${keyword}"

Respond with ONLY a valid JSON array. No markdown. No explanation. No code fences.
Each object in the array must have exactly these fields:
{
  "sku":         string  — a realistic product SKU code (e.g., "ELEC-EAR-005"),
  "productName": string  — a short, realistic product name,
  "category":    string  — one of: ELECTRONICS, HOME, GROCERY, CLOTHING, SPORTS, BEAUTY,
  "trendScore":  number  — float between 0.0 and 1.0 (1.0 = maximum demand spike predicted),
  "reason":      string  — one sentence explaining why this product trends for this keyword
}

Return between 3 and 8 products. Order by trendScore descending.
`;

// ── Private: Call Gemini API ──────────────────────────────────────────────────

/**
 * Sends the trend keyword to Google Gemini and parses the JSON response.
 *
 * @param {string} keyword - Trend keyword to analyze.
 * @returns {Promise<Array>} Parsed array of trending product objects.
 * @throws {AppError} 502 if the AI response cannot be parsed as valid JSON.
 */
const callGeminiAI = async (keyword) => {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  logger.info(`[TrendAnalysis] Calling Gemini AI for keyword: "${keyword}"`);

  const prompt = buildTrendPrompt(keyword);
  const result = await model.generateContent(prompt);
  const rawText = result.response.text().trim();

  logger.debug(`[TrendAnalysis] Raw Gemini response: ${rawText.substring(0, 300)}...`);

  // ── Parse JSON defensively
  let trendingProducts;
  try {
    // Strip accidental markdown code fences if the model adds them despite instructions
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    trendingProducts = JSON.parse(cleaned);

    if (!Array.isArray(trendingProducts)) {
      throw new Error('Gemini did not return a JSON array.');
    }
  } catch (parseErr) {
    logger.error(`[TrendAnalysis] JSON parse failed: ${parseErr.message}`);
    throw new AppError(
      `AI response could not be parsed as valid JSON. Raw: "${rawText.substring(0, 200)}"`,
      502,
    );
  }

  logger.info(`[TrendAnalysis] Gemini returned ${trendingProducts.length} trending products.`);
  return trendingProducts;
};

// ── Private: Cross-reference with inventory ───────────────────────────────────

/**
 * For each AI-predicted trending product, looks up the inventory record by SKU.
 * Classifies each match as LOW_STOCK, ADEQUATE, or NOT_FOUND.
 *
 * @param {Array} trendingProducts - Array from Gemini AI.
 * @returns {Promise<Array>} Enriched array with inventory data attached.
 */
const crossReferenceInventory = async (trendingProducts) => {
  const skus = trendingProducts.map((p) => p.sku);

  // Fetch all matching products + their inventory in a single JOIN query
  const products = await Product.findAll({
    where:   { sku: { [Op.in]: skus }, isActive: true },
    include: [
      {
        model:   Inventory,
        as:      'inventoryRecords',
        // Pick only the columns we need for the stock check
        attributes: [
          'id', 'warehouseLocation',
          'quantityOnHand', 'quantityReserved', 'reorderPoint',
          'safetyStockLevel',
        ],
      },
    ],
  });

  // Build a lookup map: SKU → DB product record
  const productMap = new Map(products.map((p) => [p.sku, p]));

  // Enrich each AI result with live DB data
  return trendingProducts.map((aiProduct) => {
    const dbProduct = productMap.get(aiProduct.sku);

    if (!dbProduct) {
      return { ...aiProduct, status: 'NOT_IN_CATALOG', dbProduct: null, inventoryRecords: [] };
    }

    const records        = dbProduct.inventoryRecords || [];
    const totalOnHand    = records.reduce((sum, r) => sum + r.quantityOnHand, 0);
    const isLowStock     = totalOnHand < RESTOCK_THRESHOLD;

    return {
      ...aiProduct,
      dbProductId:      dbProduct.id,
      dbProductName:    dbProduct.name,
      totalOnHand,
      reorderPoint:     records[0]?.reorderPoint ?? 0,
      isLowStock,
      status:           isLowStock ? 'LOW_STOCK' : 'ADEQUATE',
      inventoryRecords: records,
    };
  });
};

// ── Private: Persist trend signals ────────────────────────────────────────────

/**
 * For items that are BOTH trending (AI-identified) AND low in stock,
 * upserts a row in the `trend_signals` table.
 *
 * Uses Sequelize's `upsert` (INSERT ... ON DUPLICATE KEY UPDATE equivalent)
 * keyed on (product_id, signal_source, signal_date) to avoid duplicates
 * if the same keyword is analyzed multiple times in the same day.
 *
 * @param {Array}  enrichedProducts - Output from crossReferenceInventory().
 * @param {string} keyword          - Original trend keyword.
 * @returns {Promise<Array>} Array of upserted signal records.
 */
const persistTrendSignals = async (enrichedProducts, keyword) => {
  const today     = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SIGNAL_TTL_DAYS);

  const actionablePredictions = enrichedProducts.filter(
    (p) => p.status === 'LOW_STOCK' && p.dbProductId,
  );

  if (actionablePredictions.length === 0) {
    logger.info('[TrendAnalysis] No low-stock trending items found. No signals written.');
    return [];
  }

  logger.info(
    `[TrendAnalysis] Writing/updating ${actionablePredictions.length} trend signal(s) for low-stock items.`,
  );

  const upsertPromises = actionablePredictions.map(async (item) => {
    const signalData = {
      productId:    item.dbProductId,
      signalSource: 'GEMINI_AI',
      signalType:   'DEMAND_SPIKE',
      signalScore:  parseFloat(item.trendScore.toFixed(4)),  // clamp to 4 decimals
      weight:       AI_SIGNAL_WEIGHT,
      keyword,
      rawPayload: {
        aiProductName: item.productName,
        reason:        item.reason,
        category:      item.category,
        totalOnHand:   item.totalOnHand,
        analyzedAt:    new Date().toISOString(),
      },
      signalDate: today,
      expiresAt,
      ingestedAt: new Date(),
    };

    // Upsert: update signal_score if the same product+source+date already exists
    const [signal, created] = await TrendSignal.upsert(signalData, {
      returning: true,
    });

    logger.info(
      `[TrendAnalysis] ${created ? 'Created' : 'Updated'} signal for SKU: ${item.sku} | score: ${item.trendScore}`,
    );

    return { signal, created };
  });

  return Promise.all(upsertPromises);
};

// ── Public: Main Entry Point ──────────────────────────────────────────────────

/**
 * analyzeKeyword
 * --------------
 * Master orchestration function. Called by the controller.
 *
 * @param {string} keyword - Consumer trend phrase (e.g., "Winter coming").
 * @returns {Promise<AnalysisReport>} Structured report object.
 *
 * @example
 * const report = await TrendAnalysisService.analyzeKeyword('Winter coming');
 * // report.summary.totalTrending        → 6
 * // report.summary.lowStockAlerts       → 2
 * // report.summary.signalsWritten       → 2
 * // report.trendingProducts             → [{ sku, status, trendScore, ... }]
 */
const analyzeKeyword = async (keyword) => {
  if (!keyword || typeof keyword !== 'string' || keyword.trim().length < 2) {
    throw new AppError('keyword must be a non-empty string of at least 2 characters.', 400);
  }

  const sanitizedKeyword = keyword.trim();
  logger.info(`[TrendAnalysis] ── Starting analysis for keyword: "${sanitizedKeyword}" ──`);

  // Step 1 — AI Analysis
  const aiProducts = await callGeminiAI(sanitizedKeyword);

  // Step 2 — Inventory Cross-Reference
  const enriched = await crossReferenceInventory(aiProducts);

  // Step 3 — Persist signals for low-stock + trending items
  const upsertResults = await persistTrendSignals(enriched, sanitizedKeyword);

  // Step 4 — Build structured report
  const report = {
    keyword:  sanitizedKeyword,
    analyzedAt: new Date().toISOString(),
    summary: {
      totalTrending:   enriched.length,
      inCatalog:       enriched.filter((p) => p.status !== 'NOT_IN_CATALOG').length,
      lowStockAlerts:  enriched.filter((p) => p.status === 'LOW_STOCK').length,
      adequate:        enriched.filter((p) => p.status === 'ADEQUATE').length,
      notInCatalog:    enriched.filter((p) => p.status === 'NOT_IN_CATALOG').length,
      signalsWritten:  upsertResults.length,
      threshold:       RESTOCK_THRESHOLD,
    },
    trendingProducts: enriched.map(({ inventoryRecords: _inv, ...rest }) => rest), // strip raw DB records
  };

  logger.info(
    '[TrendAnalysis] ── Complete. ' +
    `Trending: ${report.summary.totalTrending} | ` +
    `Low-stock alerts: ${report.summary.lowStockAlerts} | ` +
    `Signals written: ${report.summary.signalsWritten} ──`,
  );

  return report;
};

module.exports = { analyzeKeyword };
