// ============================================================
// Shared Models — Interfaces matching backend API contracts
// ============================================================

export interface TrendSignal {
  id: string;
  productId: string;
  signalSource: string;
  signalType: string;
  signalScore: number;        // 0.0000 – 1.0000 (multiply by 100 for display)
  weight: number;
  keyword: string;
  rawPayload: TrendRawPayload;
  signalDate: string;
  expiresAt: string;
  ingestedAt: string;
  product: ProductSummary;
}

export interface TrendRawPayload {
  aiProductName: string;
  reason: string;
  category: string;
  totalOnHand: number;
  analyzedAt: string;
}

export interface ProductSummary {
  id: string;
  sku: string;
  name: string;
  category: string;
}

// ── Dashboard row model — flattened from TrendSignal for table display
export interface DashboardRow {
  id: string;
  sku: string;
  productName: string;
  category: string;
  trendScore: number;       // 0–100 (percentage)
  currentStock: number;
  predictedDemand: number;  // trendScore * weight coefficient
  signalType: string;
  signalSource: string;
  reason: string;
  ingestedAt: string;
  isAlert: boolean;         // true if trendScore > 70 AND stock < 50
}

export interface AnalyzeRequest {
  keyword: string;
}

export interface AnalyzeSummary {
  totalTrending: number;
  lowStockAlerts: number;
  signalsWritten: number;
  adequate: number;
  notInCatalog: number;
  threshold: number;
}

export interface AnalyzeReport {
  keyword: string;
  analyzedAt: string;
  summary: AnalyzeSummary;
  trendingProducts: TrendingProduct[];
}

export interface TrendingProduct {
  sku: string;
  productName: string;
  category: string;
  trendScore: number;
  reason: string;
  status: 'LOW_STOCK' | 'ADEQUATE' | 'NOT_IN_CATALOG';
  totalOnHand: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ── Signal Type display mapping
export const SIGNAL_TYPE_LABELS: Record<string, string> = {
  DEMAND_SPIKE:        '📈 Demand Spike',
  DEMAND_DROP:         '📉 Demand Drop',
  SEASONAL_PEAK:       '🌊 Seasonal Peak',
  SEASONAL_TROUGH:     '❄️ Seasonal Trough',
  COMPETITOR_STOCKOUT: '🏪 Competitor Stockout',
  SOCIAL_BUZZ:         '💬 Social Buzz',
  PRICE_SENSITIVITY:   '💰 Price Sensitivity',
  CUSTOM:              '🔧 Custom',
};
