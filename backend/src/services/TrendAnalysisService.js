'use strict';

/**
 * TrendAnalysisService.js — AI-powered demand trend analysis
 *
 * Flow: analyzeKeyword(keyword)
 *   1. callGeminiAI      → sends keyword to Google Gemini, parses JSON response
 *   2. crossReferenceInventory → joins AI products with live DB inventory by SKU
 *   3. persistTrendSignals    → upserts trend_signals for LOW_STOCK + trending items
 *   4. Returns structured analysis report
 *
 * Security: API keys loaded exclusively from process.env — never hardcoded.
 */

const { GoogleGenerativeAI }              = require('@google/generative-ai');
const { Op }                              = require('sequelize');
const { Product, Inventory, TrendSignal } = require('../models');
const logger                              = require('../utils/logger');
const AppError                            = require('../errors/AppError');

// Configurable thresholds
const RESTOCK_THRESHOLD = Number(process.env.TREND_RESTOCK_THRESHOLD) || 50; // units below which stock is "at risk"
const SIGNAL_TTL_DAYS   = Number(process.env.TREND_SIGNAL_TTL_DAYS)   || 7;  // days before a signal expires
const AI_SIGNAL_WEIGHT  = 1.8; // higher than manual signals (1.0) — AI is data-driven

// ── Gemini client ────────────────────────────────────────────────────────────

/** Returns a Gemini client. Throws 503 if GEMINI_API_KEY is missing. */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AppError('GEMINI_API_KEY is not configured. See .env.example.', 503);
  return new GoogleGenerativeAI(apiKey);
};

// ── Prompt builder ───────────────────────────────────────────────────────────

/** Constructs a strict JSON-only prompt — avoids fragile regex parsing of prose responses. */
const buildTrendPrompt = (keyword) => `
You are an expert retail demand forecasting AI embedded in an inventory management system.

Analyze the following consumer trend keyword and identify which product categories and
specific product SKUs are likely to experience a significant demand spike.

Trend keyword: "${keyword}"

Respond with ONLY a valid JSON array. No markdown. No explanation. No code fences.
Each object must have exactly these fields:
{
  "sku":         string  — a realistic product SKU code (e.g., "ELEC-EAR-005"),
  "productName": string  — a short, realistic product name,
  "category":    string  — one of: ELECTRONICS, HOME, GROCERY, CLOTHING, SPORTS, BEAUTY,
  "trendScore":  number  — float 0.0–1.0 (1.0 = maximum demand spike predicted),
  "reason":      string  — one sentence explaining why this product trends for this keyword
}

Return between 3 and 8 products. Order by trendScore descending.
`;

// ── Gemini API call ──────────────────────────────────────────────────────────

/** Calls Gemini and returns the parsed trending-products array. */
const callGeminiAI = async (keyword) => {
  const model  = getGeminiClient().getGenerativeModel({ model: 'gemini-2.5-flash' });
  logger.info(`[TrendAnalysis] Calling Gemini for keyword: "${keyword}"`);

  const result  = await model.generateContent(buildTrendPrompt(keyword));
  const rawText = result.response.text().trim();
  logger.debug(`[TrendAnalysis] Raw response: ${rawText.substring(0, 300)}...`);

  try {
    // Strip accidental markdown fences the model sometimes adds despite instructions
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed  = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error('Gemini did not return a JSON array.');
    logger.info(`[TrendAnalysis] Gemini returned ${parsed.length} trending products.`);
    return parsed;
  } catch (e) {
    logger.error(`[TrendAnalysis] JSON parse failed: ${e.message}`);
    throw new AppError(`AI response could not be parsed. Raw: "${rawText.substring(0, 200)}"`, 502);
  }
};

// ── Inventory cross-reference ────────────────────────────────────────────────

/** Joins AI-predicted SKUs with live DB inventory. Classifies each as LOW_STOCK, ADEQUATE, or NOT_IN_CATALOG. */
const crossReferenceInventory = async (trendingProducts) => {
  const skus     = trendingProducts.map((p) => p.sku);
  const products = await Product.findAll({
    where:   { sku: { [Op.in]: skus }, isActive: true },
    include: [{ model: Inventory, as: 'inventoryRecords', attributes: ['id', 'warehouseLocation', 'quantityOnHand', 'quantityReserved', 'reorderPoint', 'safetyStockLevel'] }],
  });

  const productMap = new Map(products.map((p) => [p.sku, p]));

  return trendingProducts.map((aiProduct) => {
    const dbProduct = productMap.get(aiProduct.sku);
    if (!dbProduct) return { ...aiProduct, status: 'NOT_IN_CATALOG', dbProduct: null, inventoryRecords: [] };

    const records     = dbProduct.inventoryRecords || [];
    const totalOnHand = records.reduce((sum, r) => sum + r.quantityOnHand, 0);
    const isLowStock  = totalOnHand < RESTOCK_THRESHOLD;

    return {
      ...aiProduct,
      dbProductId: dbProduct.id, dbProductName: dbProduct.name,
      totalOnHand, reorderPoint: records[0]?.reorderPoint ?? 0,
      isLowStock, status: isLowStock ? 'LOW_STOCK' : 'ADEQUATE', inventoryRecords: records,
    };
  });
};

// ── Persist trend signals ────────────────────────────────────────────────────

/**
 * Upserts trend_signals for items that are BOTH low-stock AND AI-trending.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE (keyed on product_id + signal_source + signal_date).
 */
const persistTrendSignals = async (enrichedProducts, keyword) => {
  const today     = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SIGNAL_TTL_DAYS);

  const actionable = enrichedProducts.filter((p) => p.status === 'LOW_STOCK' && p.dbProductId);
  if (!actionable.length) { logger.info('[TrendAnalysis] No low-stock trending items. No signals written.'); return []; }

  logger.info(`[TrendAnalysis] Writing ${actionable.length} trend signal(s).`);

  return Promise.all(actionable.map(async (item) => {
    const [signal, created] = await TrendSignal.upsert({
      productId:    item.dbProductId,
      signalSource: 'GEMINI_AI',
      signalType:   'DEMAND_SPIKE',
      signalScore:  parseFloat(item.trendScore.toFixed(4)),
      weight:       AI_SIGNAL_WEIGHT,
      keyword,
      rawPayload: { aiProductName: item.productName, reason: item.reason, category: item.category, totalOnHand: item.totalOnHand, analyzedAt: new Date().toISOString() },
      signalDate: today, expiresAt, ingestedAt: new Date(),
    }, { returning: true });

    logger.info(`[TrendAnalysis] ${created ? 'Created' : 'Updated'} signal: SKU ${item.sku} | score: ${item.trendScore}`);
    return { signal, created };
  }));
};

// ── Public entry point ───────────────────────────────────────────────────────

/**
 * analyzeKeyword — master orchestration function, called by the controller.
 * @param {string} keyword - Consumer trend phrase (e.g., "Winter coming")
 * @returns {Promise<AnalysisReport>} Structured report with summary + trending products
 */
const analyzeKeyword = async (keyword) => {
  if (!keyword || typeof keyword !== 'string' || keyword.trim().length < 2) {
    throw new AppError('keyword must be a non-empty string of at least 2 characters.', 400);
  }

  const kw = keyword.trim();
  logger.info(`[TrendAnalysis] Starting analysis for: "${kw}"`);

  const aiProducts = await callGeminiAI(kw);
  const enriched   = await crossReferenceInventory(aiProducts);
  const upserted   = await persistTrendSignals(enriched, kw);

  const count = (status) => enriched.filter((p) => p.status === status).length;
  const report = {
    keyword: kw, analyzedAt: new Date().toISOString(),
    summary: {
      totalTrending:  enriched.length,
      inCatalog:      enriched.filter((p) => p.status !== 'NOT_IN_CATALOG').length,
      lowStockAlerts: count('LOW_STOCK'),
      adequate:       count('ADEQUATE'),
      notInCatalog:   count('NOT_IN_CATALOG'),
      signalsWritten: upserted.length,
      threshold:      RESTOCK_THRESHOLD,
    },
    trendingProducts: enriched.map(({ inventoryRecords: _inv, ...rest }) => rest),
  };

  logger.info(
    `[TrendAnalysis] Complete. Trending: ${report.summary.totalTrending} | ` +
    `Low-stock: ${report.summary.lowStockAlerts} | Signals: ${report.summary.signalsWritten}`,
  );
  return report;
};

module.exports = { analyzeKeyword };
