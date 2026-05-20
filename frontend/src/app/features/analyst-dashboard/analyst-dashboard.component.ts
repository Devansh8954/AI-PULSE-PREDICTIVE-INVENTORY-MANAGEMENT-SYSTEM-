import {
  Component, OnInit, ViewChild, ElementRef,
  AfterViewInit, OnDestroy
} from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { InventoryService } from '../../core/services/inventory.service';
import { ForecastService, ForecastResult } from '../../core/services/forecast.service';

Chart.register(...registerables);

/** Flattened row built from Inventory + Forecast data */
export interface ForecastRow {
  productId: string;
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  predictedDemand: number;
  depletionDays: number;      // currentStock / avgDailyDemand (est.)
  confidence: number;         // avgTrendScore × 100
  alertLevel: 'CRITICAL' | 'MODERATE' | 'LOW';
  trend: 'up' | 'down' | 'stable';
}

@Component({
  selector: 'app-analyst-dashboard',
  templateUrl: './analyst-dashboard.component.html',
  styleUrls: ['./analyst-dashboard.component.scss'],
})
export class AnalystDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('lineChart') lineChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieChart')  pieChartCanvas!:  ElementRef<HTMLCanvasElement>;

  private lineChart!: Chart;
  private pieChart!: Chart;
  private destroy$ = new Subject<void>();

  // ── State ─────────────────────────────────────────────────────────────────────
  isLoading      = true;
  apiError       = '';
  forecastRows:  ForecastRow[] = [];

  // ── Computed stats (derived from live data) ───────────────────────────────────
  get stats() {
    const rows = this.forecastRows;
    const criticalCount = rows.filter(r => r.alertLevel === 'CRITICAL').length;
    const avgConf = rows.length
      ? Math.round(rows.reduce((s, r) => s + r.confidence, 0) / rows.length)
      : 0;
    const avgDepletion = rows.length
      ? Math.round(rows.reduce((s, r) => s + r.depletionDays, 0) / rows.length)
      : 0;
    const categories = new Set(rows.map(r => r.category)).size;

    return {
      forecastAccuracy: avgConf,
      signalsAnalyzed:  rows.length,
      avgDepletionDays: avgDepletion,
      categoriesTracked: categories,
    };
  }

  displayedCols = [
    'sku', 'productName', 'category',
    'currentStock', 'predictedDemand',
    'depletionDays', 'confidence', 'alertLevel', 'trend'
  ];

  constructor(
    private inventoryService: InventoryService,
    private forecastService:  ForecastService,
  ) {}

  ngOnInit(): void {
    this.loadForecastData();
  }

  ngAfterViewInit(): void {
    this.buildLineChart();
    this.buildPieChart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.lineChart?.destroy();
    this.pieChart?.destroy();
  }

  onRefresh(): void {
    this.loadForecastData();
  }

  // ── Data helpers ──────────────────────────────────────────────────────────────

  getTrendIcon(trend: string): string {
    return { up: 'trending_up', down: 'trending_down', stable: 'trending_flat' }[trend] ?? 'trending_flat';
  }

  getTrendClass(trend: string): string {
    return { up: 'text-red', down: 'text-green', stable: 'text-muted' }[trend] ?? '';
  }

  getDepletionClass(days: number): string {
    if (days <= 7)  return 'text-red';
    if (days <= 20) return 'text-gold';
    return 'text-green';
  }

  getAlertClass(level: string): string {
    return { CRITICAL: 'badge--red', MODERATE: 'badge--gold', LOW: 'badge--green' }[level] ?? '';
  }

  // ── Private: load ────────────────────────────────────────────────────────────

  /**
   * Strategy:
   * 1. Load all products from GET /api/v1/products
   * 2. For each product, call GET /api/v1/forecast/:id (parallel via forkJoin)
   * 3. Merge forecast results with inventory data → ForecastRow[]
   * 4. Update charts with live data
   */
  private loadForecastData(): void {
    this.isLoading = true;
    this.apiError  = '';

    this.forecastService.getProducts()
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.apiError = this.getErrorMessage(err);
          return of([]);
        })
      )
      .subscribe(products => {
        if (!products.length) {
          this.isLoading = false;
          return;
        }

        // Build parallel forecast calls — one per product
        const forecastCalls = products.map((p: any) =>
          this.forecastService.getForecast(p.id).pipe(
            catchError(() => of(null)) // skip products with no signals
          )
        );

        forkJoin(forecastCalls)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isLoading = false)
          )
          .subscribe((results: (ForecastResult | null)[]) => {
            const productMap = Object.fromEntries(
              products.map((p: any) => [p.id, p])
            );

            this.forecastRows = results
              .filter((r): r is ForecastResult => r !== null && r.signalCount > 0)
              .map(r => this.toForecastRow(r, productMap[r.productId]));

            // Update charts after data is ready and view is initialised
            this.updateLineChart();
            this.updatePieChart();
          });
      });
  }

  private toForecastRow(forecast: ForecastResult, product: any): ForecastRow {
    const confidence = Math.round(forecast.avgTrendScore * 100);
    // Estimated depletion: stock / (predictedDemand / 30 days)
    const dailyDemand    = forecast.predictedDemand / 30;
    const depletionDays  = dailyDemand > 0
      ? Math.min(Math.round(forecast.currentStock / dailyDemand), 999)
      : 999;

    const trend: 'up' | 'down' | 'stable' =
      forecast.avgTrendScore > 0.6 ? 'up' :
      forecast.avgTrendScore < 0.3 ? 'down' : 'stable';

    return {
      productId:       forecast.productId,
      sku:             forecast.sku,
      productName:     forecast.productName,
      category:        product?.category ?? '—',
      currentStock:    forecast.currentStock,
      predictedDemand: forecast.predictedDemand,
      depletionDays,
      confidence,
      alertLevel:      forecast.alertLevel,
      trend,
    };
  }

  private getErrorMessage(err: any): string {
    const status = err?.status;
    if (status === 401 || status === 403) return '⚠️ Not authenticated. Please log in to view live data.';
    return '⚠️ Could not reach the backend. Make sure the server is running on port 3000.';
  }

  // ── Private: Chart.js (now data-driven) ────────────────────────────────────

  private buildLineChart(): void {
    if (!this.lineChartCanvas) return;
    const ctx = this.lineChartCanvas.nativeElement.getContext('2d')!;
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Stock (avg)',
            data: [],
            borderColor: '#58a6ff',
            backgroundColor: 'rgba(88,166,255,0.1)',
            tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#58a6ff',
          },
          {
            label: 'Predicted Demand (avg)',
            data: [],
            borderColor: '#a371f7',
            backgroundColor: 'rgba(163,113,247,0.07)',
            borderDash: [6, 3], tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#a371f7',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8b949e', font: { family: 'Inter', size: 12 }, boxWidth: 12 } },
          tooltip: { backgroundColor: '#1c2333', titleColor: '#e6edf3', bodyColor: '#8b949e', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12 },
        },
        scales: {
          x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true },
        },
        animation: { duration: 700 },
      },
    } as ChartConfiguration);
  }

  private updateLineChart(): void {
    if (!this.lineChart || !this.forecastRows.length) return;
    // Sort top 6 by predicted demand (highest demand products)
    const top6 = [...this.forecastRows].sort((a, b) => b.predictedDemand - a.predictedDemand).slice(0, 6);
    this.lineChart.data.labels = top6.map(r => r.productName.length > 14 ? r.productName.slice(0, 14) + '…' : r.productName);
    this.lineChart.data.datasets[0].data = top6.map(r => r.currentStock);
    this.lineChart.data.datasets[1].data = top6.map(r => r.predictedDemand);
    this.lineChart.update();
  }

  private buildPieChart(): void {
    if (!this.pieChartCanvas) return;
    const ctx = this.pieChartCanvas.nativeElement.getContext('2d')!;
    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            'rgba(88,166,255,0.7)',   // blue
            'rgba(240,180,41,0.7)',   // gold
            'rgba(63,185,80,0.7)',    // green
            'rgba(163,113,247,0.7)', // purple
            'rgba(248,81,73,0.7)',    // red
            'rgba(139,148,158,0.5)', // muted
          ],
          borderColor: '#0d1117', borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8b949e', font: { family: 'Inter', size: 11 }, boxWidth: 12, padding: 12 } },
          tooltip: { backgroundColor: '#1c2333', titleColor: '#e6edf3', bodyColor: '#8b949e', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12 },
        },
        animation: { duration: 700 },
      },
    } as ChartConfiguration);
  }

  private updatePieChart(): void {
    if (!this.pieChart || !this.forecastRows.length) return;
    // Group by category and sum predicted demand
    const catMap: Record<string, number> = {};
    this.forecastRows.forEach(r => {
      catMap[r.category] = (catMap[r.category] ?? 0) + r.predictedDemand;
    });
    this.pieChart.data.labels = Object.keys(catMap);
    this.pieChart.data.datasets[0].data = Object.values(catMap);
    this.pieChart.update();
  }
}
