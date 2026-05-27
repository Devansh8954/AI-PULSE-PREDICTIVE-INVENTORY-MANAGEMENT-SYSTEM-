import {
  Component, OnInit, ViewChild, ElementRef,
  AfterViewInit, OnDestroy, NgZone
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { InventoryService } from '../../core/services/inventory.service';
import { ForecastService, ForecastResult } from '../../core/services/forecast.service';
import { MatSnackBar } from '@angular/material/snack-bar';

Chart.register(...registerables);

/** Flattened row built from Inventory + Forecast data */
export interface ForecastRow {
  productId: string;
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  predictedDemand: number;
  depletionDays: number;
  confidence: number;
  alertLevel: 'CRITICAL' | 'MODERATE' | 'LOW';
  trend: 'up' | 'down' | 'stable';
}

/** Common Chart.js theme options shared by both charts */
const CHART_THEME = {
  tooltip: {
    backgroundColor: '#1c2333',
    titleColor: '#e6edf3',
    bodyColor: '#8b949e',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    padding: 12,
  },
  legend: {
    labels: { color: '#8b949e', font: { family: 'Inter', size: 12 }, boxWidth: 12 },
  },
};

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
  private chartsBuilt = false;
  private destroy$ = new Subject<void>();

  // ── State ─────────────────────────────────────────────────────────────────
  isLoading      = true;
  apiError       = '';
  forecastRows:  ForecastRow[] = [];

  // ── Computed stats ────────────────────────────────────────────────────────
  get stats() {
    const rows = this.forecastRows;
    const avgConf = rows.length
      ? Math.round(rows.reduce((s, r) => s + r.confidence, 0) / rows.length) : 0;
    const avgDepletion = rows.length
      ? Math.round(rows.reduce((s, r) => s + r.depletionDays, 0) / rows.length) : 0;
    return {
      forecastAccuracy:  avgConf,
      signalsAnalyzed:   rows.length,
      avgDepletionDays:  avgDepletion,
      categoriesTracked: new Set(rows.map(r => r.category)).size,
    };
  }

  displayedCols = [
    'sku', 'productName', 'category',
    'currentStock', 'predictedDemand',
    'depletionDays', 'confidence', 'alertLevel', 'trend',
  ];

  /** MatTableDataSource enables client-side filtering on the forecast table */
  forecastDataSource = new MatTableDataSource<ForecastRow>([]);

  /** Active alert level filter */
  activeAlertFilter = '';

  /** Text search control */
  searchControl = new FormControl('');

  readonly alertFilters = [
    { label: 'All',      value: '',         class: '' },
    { label: 'Critical', value: 'CRITICAL',  class: 'filter--red' },
    { label: 'Moderate', value: 'MODERATE',  class: 'filter--gold' },
    { label: 'Low Risk', value: 'LOW',       class: 'filter--green' },
  ];

  constructor(
    private inventoryService: InventoryService,
    private forecastService:  ForecastService,
    private ngZone: NgZone,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // Set up filter predicate BEFORE data loads
    this.forecastDataSource.filterPredicate = (row: ForecastRow, filter: string) => {
      const parts       = filter.split('|');
      const textFilter  = parts[0] ?? '';
      const levelFilter = parts[1] ?? '';

      const textMatch  = !textFilter ||
        [row.sku, row.productName, row.category].join(' ').toLowerCase().includes(textFilter);
      const levelMatch = !levelFilter || row.alertLevel === levelFilter;
      return textMatch && levelMatch;
    };

    // Wire search control
    this.searchControl.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilter());

    this.loadForecastData();
  }

  ngAfterViewInit(): void {
    // Use 150ms delay to guarantee the canvas element is fully painted
    // before Chart.js tries to acquire its 2D context.
    // (setTimeout(0) is not enough on some Angular change-detection cycles.)
    setTimeout(() => {
      this.buildLineChart();
      this.buildPieChart();
      this.chartsBuilt = true;
      // Data may have already arrived while we were waiting — render immediately.
      if (this.forecastRows.length) {
        this.updateLineChart();
        this.updatePieChart();
      }
    }, 150);
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

  setAlertFilter(value: string): void {
    this.activeAlertFilter = value;
    this.applyFilter();
  }

  private applyFilter(): void {
    const text = (this.searchControl.value ?? '').trim().toLowerCase();
    this.forecastDataSource.filter = `${text}|${this.activeAlertFilter}`;
  }

  /** Export the currently visible (filtered) forecast rows as CSV */
  exportCSV(): void {
    const rows = this.forecastDataSource.filteredData;
    if (!rows.length) {
      this.snackBar.open('No data to export.', '✕', { duration: 3000, panelClass: ['snack-error'] });
      return;
    }
    const headers = ['SKU', 'Product', 'Category', 'Stock', 'Predicted Demand (30d)', 'Depletion Days', 'Confidence %', 'Alert Level', 'Trend'];
    const lines = rows.map(r => [
      r.sku, `"${r.productName}"`, r.category,
      r.currentStock, r.predictedDemand,
      r.depletionDays === 999 ? 'Safe' : r.depletionDays,
      r.confidence, r.alertLevel, r.trend,
    ].join(','));
    const csv  = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ai-pulse-forecast-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open(`✅ Exported ${rows.length} forecast rows to CSV`, '✕', { duration: 3000, panelClass: ['snack-success'] });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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

  // ── Data loading ──────────────────────────────────────────────────────────

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

        const forecastCalls = products.map((p: any) =>
          this.forecastService.getForecast(p.id).pipe(
            catchError(() => of(null))
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

            // Include ALL products that returned a valid forecast response.
            // Products with no trend signals still have real stock data
            // (avgTrendScore=0, alertLevel='LOW') and belong in the charts.
            // Filtering by signalCount > 0 caused empty charts when signals
            // hadn't been generated yet for most products.
            this.forecastRows = results
              .filter((r): r is ForecastResult => r !== null)
              .map(r => this.toForecastRow(r, productMap[r.productId]));

            // Sync the filterable data source
            this.forecastDataSource.data = this.forecastRows;
            this.applyFilter();

            // Refresh charts — run inside NgZone so change detection fires.
            // Also schedule a deferred update in case chartsBuilt is not yet
            // true (data arrived before AfterViewInit 150ms timer fired).
            this.ngZone.run(() => {
              if (this.chartsBuilt) {
                this.updateLineChart();
                this.updatePieChart();
              } else {
                // Charts not ready yet — wait for AfterViewInit then update
                setTimeout(() => {
                  this.updateLineChart();
                  this.updatePieChart();
                }, 200);
              }
            });
          });
      });
  }

  private toForecastRow(forecast: ForecastResult, product: any): ForecastRow {
    const confidence    = Math.round(forecast.avgTrendScore * 100);
    const dailyDemand   = forecast.predictedDemand / 30;
    const depletionDays = dailyDemand > 0
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

  // ── Chart builders ────────────────────────────────────────────────────────

  private buildLineChart(): void {
    if (!this.lineChartCanvas?.nativeElement) return;
    const ctx = this.lineChartCanvas.nativeElement.getContext('2d')!;
    this.lineChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Current Stock',
            data: [],
            backgroundColor: 'rgba(88,166,255,0.7)',
            borderColor: '#58a6ff',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Predicted Demand (30d)',
            data: [],
            backgroundColor: 'rgba(163,113,247,0.7)',
            borderColor: '#a371f7',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend:  { ...CHART_THEME.legend },
          tooltip: { ...CHART_THEME.tooltip },
        },
        scales: {
          x: {
            ticks: { color: '#8b949e', font: { family: 'Inter', size: 11 } },
            grid:  { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            ticks: { color: '#8b949e' },
            grid:  { color: 'rgba(255,255,255,0.06)' },
            beginAtZero: true,
          },
        },
        animation: { duration: 700 },
      },
    } as ChartConfiguration);
  }

  private updateLineChart(): void {
    if (!this.lineChart || !this.forecastRows.length) return;
    const top8 = [...this.forecastRows]
      .sort((a, b) => b.predictedDemand - a.predictedDemand)
      .slice(0, 8);

    this.lineChart.data.labels = top8.map(r =>
      r.productName.length > 14 ? r.productName.slice(0, 14) + '…' : r.productName
    );
    this.lineChart.data.datasets[0].data = top8.map(r => r.currentStock);
    this.lineChart.data.datasets[1].data = top8.map(r => r.predictedDemand);
    this.lineChart.update();
  }

  private buildPieChart(): void {
    if (!this.pieChartCanvas?.nativeElement) return;
    const ctx = this.pieChartCanvas.nativeElement.getContext('2d')!;
    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            'rgba(88,166,255,0.75)',
            'rgba(240,180,41,0.75)',
            'rgba(63,185,80,0.75)',
            'rgba(163,113,247,0.75)',
            'rgba(248,81,73,0.75)',
            'rgba(139,148,158,0.5)',
          ],
          borderColor: '#0d1117',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#8b949e', font: { family: 'Inter', size: 11 }, boxWidth: 12, padding: 12 },
          },
          tooltip: { ...CHART_THEME.tooltip },
        },
        animation: { duration: 700 },
      },
    } as ChartConfiguration);
  }

  private updatePieChart(): void {
    if (!this.pieChart || !this.forecastRows.length) return;
    const catMap: Record<string, number> = {};
    this.forecastRows.forEach(r => {
      // Normalize missing category (fallback '—') to 'Other'
      const cat = (r.category && r.category !== '—') ? r.category : 'Other';
      catMap[cat] = (catMap[cat] ?? 0) + r.predictedDemand;
    });
    this.pieChart.data.labels   = Object.keys(catMap);
    this.pieChart.data.datasets[0].data = Object.values(catMap);
    this.pieChart.update();
  }
}
