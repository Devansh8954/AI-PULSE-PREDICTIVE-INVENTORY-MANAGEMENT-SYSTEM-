import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  ApiResponse, TrendSignal, AnalyzeReport,
  DashboardRow, AnalyzeRequest
} from '../../shared/models/trend.model';

/**
 * TrendService
 * ============
 * Handles all HTTP communication with the AI-Pulse backend for
 * trend signal retrieval and analysis triggering.
 *
 * Design decisions:
 * - Uses BehaviorSubjects as reactive state stores (signals$, isLoading$).
 *   Components subscribe via async pipe — no manual subscribe/unsubscribe.
 * - transformToDashboardRows() is a pure function: all data transformation
 *   happens here, keeping components dumb (display only).
 * - TREND_SCORE_THRESHOLD and STOCK_ALERT_THRESHOLD are constants that
 *   define the gold-highlight alert rule:
 *     trendScore > 70 AND currentStock < 50 → isAlert = true
 */
@Injectable({ providedIn: 'root' })
export class TrendService {

  // ── Constants (alert rule thresholds) ─────────────────────────────────────
  static readonly TREND_SCORE_THRESHOLD = 70;   // percentage (signal_score × 100)
  static readonly STOCK_ALERT_THRESHOLD = 50;   // units on hand

  // ── Reactive state ─────────────────────────────────────────────────────────
  private readonly _signals$    = new BehaviorSubject<DashboardRow[]>([]);
  private readonly _isLoading$  = new BehaviorSubject<boolean>(false);
  private readonly _lastKeyword$ = new BehaviorSubject<string>('');

  // ── Public observables (read-only) ─────────────────────────────────────────
  readonly signals$     = this._signals$.asObservable();
  readonly isLoading$   = this._isLoading$.asObservable();
  readonly lastKeyword$ = this._lastKeyword$.asObservable();

  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiBaseUrl;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Fetches persisted trend signals from the database and transforms
   * them into DashboardRow objects for table display.
   *
   * GET /api/v1/trends/signals?limit=50
   *
   * Applies the alert rule automatically:
   *   isAlert = trendScore > 70 AND currentStock < 50
   */
  loadSignals(productId?: string, limit = 50): void {
    this._isLoading$.next(true);

    let params = new HttpParams().set('limit', limit.toString());
    if (productId) params = params.set('productId', productId);

    this.http
      .get<ApiResponse<TrendSignal[]>>(`${this.baseUrl}/trends/signals`, { params })
      .pipe(
        map(res => this.transformToDashboardRows(res.data)),
        tap(rows => this._signals$.next(rows)),
        catchError(err => {
          console.error('[TrendService] Failed to load signals:', err);
          return throwError(() => err);
        }),
        finalize(() => this._isLoading$.next(false))
      )
      .subscribe();
  }

  /**
   * Triggers an AI analysis for the given keyword.
   * On success, automatically refreshes the signals list.
   *
   * POST /api/v1/trends/analyze
   *
   * @param keyword - Consumer trend phrase (e.g., "Winter coming")
   * @returns Observable<AnalyzeReport> — contains full AI analysis report.
   */
  analyzeKeyword(keyword: string): Observable<AnalyzeReport> {
    this._isLoading$.next(true);
    this._lastKeyword$.next(keyword);

    const body: AnalyzeRequest = { keyword };

    return this.http
      .post<ApiResponse<AnalyzeReport>>(`${this.baseUrl}/trends/analyze`, body)
      .pipe(
        map(res => res.data),
        tap(() => this.loadSignals()), // auto-refresh table after analysis
        catchError(err => {
          console.error('[TrendService] Analysis failed:', err);
          return throwError(() => err);
        }),
        finalize(() => this._isLoading$.next(false))
      );
  }

  /**
   * Returns the top N rows sorted by trendScore descending.
   * Used by Chart.js to populate the bar chart dataset.
   */
  getTopNByTrendScore(rows: DashboardRow[], n = 5): DashboardRow[] {
    return [...rows]
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, n);
  }

  // ── Private: Data transformation ───────────────────────────────────────────

  /**
   * Pure transformation function: TrendSignal[] → DashboardRow[]
   *
   * Key conversions:
   * - signal_score (0.0–1.0) → trendScore (0–100) for readable display
   * - predictedDemand = trendScore * weight * coefficient (demand estimation)
   * - isAlert = trendScore > 70 AND currentStock < 50
   *
   * Defensive: handles missing rawPayload gracefully with fallback values.
   */
  private transformToDashboardRows(signals: TrendSignal[]): DashboardRow[] {
    return signals.map(signal => {
      const trendScore    = Math.round((signal.signalScore ?? 0) * 100);
      const currentStock  = signal.rawPayload?.totalOnHand ?? 0;
      // Estimated demand = stock that would be needed based on trend strength
      const predictedDemand = Math.round(currentStock * (1 + signal.signalScore * signal.weight));

      const isAlert =
        trendScore   > TrendService.TREND_SCORE_THRESHOLD &&
        currentStock < TrendService.STOCK_ALERT_THRESHOLD;

      return {
        id:             signal.id,
        sku:            signal.product?.sku          ?? '—',
        productName:    signal.product?.name         ?? signal.rawPayload?.aiProductName ?? '—',
        category:       signal.product?.category     ?? signal.rawPayload?.category      ?? '—',
        trendScore,
        currentStock,
        predictedDemand,
        signalType:     signal.signalType,
        signalSource:   signal.signalSource,
        reason:         signal.rawPayload?.reason    ?? '—',
        ingestedAt:     signal.ingestedAt,
        isAlert,
      };
    });
  }
}
