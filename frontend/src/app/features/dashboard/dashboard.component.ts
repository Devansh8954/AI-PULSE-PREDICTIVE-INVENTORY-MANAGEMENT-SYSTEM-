import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { TrendService } from '../../core/services/trend.service';
import { DashboardRow, AnalyzeReport, SIGNAL_TYPE_LABELS } from '../../shared/models/trend.model';

// Register all Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Table config ────────────────────────────────────────────────────────────
  readonly displayedColumns: string[] = [
    'status', 'sku', 'productName', 'category',
    'trendScore', 'currentStock', 'predictedDemand',
    'signalType', 'reason'
  ];

  dataSource = new MatTableDataSource<DashboardRow>([]);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('barChartCanvas') barChartCanvas!: ElementRef<HTMLCanvasElement>;

  // ── State ───────────────────────────────────────────────────────────────────
  isLoading$       = this.trendService.isLoading$;
  lastKeyword$     = this.trendService.lastKeyword$;
  lastReport!: AnalyzeReport | null;

  // ── Form controls ───────────────────────────────────────────────────────────
  keywordControl  = new FormControl('', [Validators.required, Validators.minLength(2)]);
  filterControl   = new FormControl('');

  // ── Stats ───────────────────────────────────────────────────────────────────
  stats = { total: 0, alerts: 0, adequate: 0, avgTrendScore: 0 };

  // ── Chart ───────────────────────────────────────────────────────────────────
  private barChart!: Chart;

  // ── Signal type labels ──────────────────────────────────────────────────────
  readonly signalTypeLabels = SIGNAL_TYPE_LABELS;

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly trendService: TrendService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // ── Set filter predicate BEFORE subscribing to valueChanges ──────────────
    // Moving this here (rather than ngAfterViewInit) ensures the predicate
    // is active from the very first keystroke.
    this.dataSource.filterPredicate = (row: DashboardRow, filter: string) => {
      const parts = filter.split('|');
      const textFilter = parts[0] ?? '';
      const typeFilter = parts[1] ?? '';

      const textMatch = !textFilter ||
        [row.sku, row.productName, row.category, row.reason, row.signalType]
          .join(' ').toLowerCase().includes(textFilter);

      const typeMatch = !typeFilter || row.signalType === typeFilter;

      return textMatch && typeMatch;
    };

    // Subscribe to the signals stream and push into the Material DataSource
    this.trendService.signals$
      .pipe(takeUntil(this.destroy$))
      .subscribe(rows => {
        this.dataSource.data = rows;
        this.updateStats(rows);
        this.updateChart(rows);
      });

    // Live filter: debounced search box filters the table
    this.filterControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFilter());

    // Initial data load
    this.trendService.loadSignals();
  }

  ngAfterViewInit(): void {
    // Attach sort AFTER view is ready
    this.dataSource.sort = this.sort;

    // Custom sort accessor for nested / computed fields
    this.dataSource.sortingDataAccessor = (row, col) => {
      switch (col) {
        case 'trendScore':      return row.trendScore;
        case 'currentStock':    return row.currentStock;
        case 'predictedDemand': return row.predictedDemand;
        default:                return (row as any)[col] ?? '';
      }
    };

    // Build the chart canvas (empty, will populate on data load)
    this.initChart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.barChart?.destroy();
  }

  // ── Public Actions ──────────────────────────────────────────────────────────

  /** Active signal type filter ('' = all) */
  activeTypeFilter = '';

  /** Available quick-filter signal types */
  readonly signalTypeFilters = [
    { label: 'All',           value: '' },
    { label: 'Demand Surge',  value: 'DEMAND_SURGE' },
    { label: 'Supply Shock',  value: 'SUPPLY_SHOCK' },
    { label: 'Seasonal',      value: 'SEASONAL' },
    { label: 'Trend Spike',   value: 'TREND_SPIKE' },
  ];

  setTypeFilter(value: string): void {
    this.activeTypeFilter = value;
    this.applyFilter();
  }

  private applyFilter(): void {
    const text = (this.filterControl.value ?? '').trim().toLowerCase();
    this.dataSource.filter = `${text}|${this.activeTypeFilter}`;
  }

  /** Export visible table rows as CSV */
  exportCSV(): void {
    const rows = this.dataSource.filteredData;
    if (!rows.length) { this.showSnack('No data to export.', 'snack-error'); return; }

    const headers = ['SKU', 'Product', 'Category', 'Trend Score', 'Stock', 'Predicted Demand', 'Signal Type', 'AI Reason', 'Status'];
    const lines = rows.map(r =>
      [
        r.sku, `"${r.productName}"`, r.category,
        r.trendScore, r.currentStock, r.predictedDemand,
        r.signalType, `"${r.reason?.replace(/"/g, "'") ?? ''}"`,
        r.isAlert ? 'Alert' : 'OK',
      ].join(',')
    );

    const csv  = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ai-pulse-signals-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showSnack(`✅ Exported ${rows.length} signals to CSV`, 'snack-success');
  }

  /**
   * Triggers AI analysis for the entered keyword.
   * Disabled while a request is in flight.
   */
  onAnalyze(): void {
    if (this.keywordControl.invalid) {
      this.keywordControl.markAsTouched();
      return;
    }

    const keyword = this.keywordControl.value!.trim();

    this.trendService.analyzeKeyword(keyword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report: AnalyzeReport) => {
          this.lastReport = report;
          this.showSnack(
            `✅ Analysis complete — ${report.summary.signalsWritten} signals written for "${keyword}"`,
            'snack-success'
          );
        },
        error: err => {
          const msg = err?.error?.error?.message ?? 'Analysis failed. Check your API key and backend.';
          this.showSnack(`❌ ${msg}`, 'snack-error');
        }
      });
  }

  /** Refreshes the signals list from the backend. */
  onRefresh(): void {
    this.trendService.loadSignals();
    this.showSnack('🔄 Refreshing signals...', 'snack-success');
  }

  /** Row class: returns 'alert-row' for gold highlighting. */
  getRowClass(row: DashboardRow): string {
    return row.isAlert ? 'alert-row' : '';
  }

  /** Formats signal_score percentage for display. */
  formatScore(score: number): string {
    return `${score}%`;
  }

  /** Formats a signal type key to a readable label. */
  formatSignalType(type: string): string {
    return this.signalTypeLabels[type] ?? type;
  }

  // ── Private: Stats ──────────────────────────────────────────────────────────

  private updateStats(rows: DashboardRow[]): void {
    const alerts = rows.filter(r => r.isAlert).length;
    const avg    = rows.length
      ? Math.round(rows.reduce((s, r) => s + r.trendScore, 0) / rows.length)
      : 0;

    this.stats = {
      total:         rows.length,
      alerts,
      adequate:      rows.length - alerts,
      avgTrendScore: avg,
    };
  }

  // ── Private: Chart.js ───────────────────────────────────────────────────────

  /**
   * Initialises an empty Chart.js bar chart on the canvas element.
   * Called once in ngAfterViewInit.
   */
  private initChart(): void {
    if (!this.barChartCanvas) return;
    const ctx = this.barChartCanvas.nativeElement.getContext('2d')!;

    const config: ChartConfiguration = {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#8b949e', font: { family: 'Inter', size: 12 }, boxWidth: 12 },
          },
          tooltip: {
            backgroundColor: '#1c2333',
            titleColor:      '#e6edf3',
            bodyColor:       '#8b949e',
            borderColor:     'rgba(255,255,255,0.1)',
            borderWidth:     1,
            padding:         12,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} units`,
            },
          },
        },
        scales: {
          x: {
            ticks:  { color: '#8b949e', font: { family: 'Inter', size: 11 } },
            grid:   { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            ticks:  { color: '#8b949e', font: { family: 'Inter', size: 11 } },
            grid:   { color: 'rgba(255,255,255,0.06)' },
            beginAtZero: true,
          },
        },
        animation: { duration: 600, easing: 'easeInOutQuart' },
      },
    };

    this.barChart = new Chart(ctx, config);
  }

  /**
   * Updates Chart.js datasets with the top 5 trending products.
   * Called every time the signals BehaviorSubject emits.
   */
  private updateChart(rows: DashboardRow[]): void {
    if (!this.barChart) return;

    const top5 = this.trendService.getTopNByTrendScore(rows, 5);

    this.barChart.data.labels = top5.map(r =>
      r.productName.length > 18 ? r.productName.substring(0, 18) + '…' : r.productName
    );

    this.barChart.data.datasets = [
      {
        label:           'Current Stock',
        data:            top5.map(r => r.currentStock),
        backgroundColor: 'rgba(88, 166, 255, 0.7)',
        borderColor:     '#58a6ff',
        borderWidth:     1,
        borderRadius:    6,
        borderSkipped:   false,
      },
      {
        label:           'Predicted Demand',
        data:            top5.map(r => r.predictedDemand),
        backgroundColor: 'rgba(240, 180, 41, 0.7)',
        borderColor:     '#f0b429',
        borderWidth:     1,
        borderRadius:    6,
        borderSkipped:   false,
      },
    ];

    this.barChart.update();
  }

  // ── Private: Helpers ────────────────────────────────────────────────────────

  private showSnack(message: string, panelClass: string): void {
    this.snackBar.open(message, '✕', {
      duration:    4000,
      panelClass:  [panelClass],
      horizontalPosition: 'right',
      verticalPosition:   'top',
    });
  }
}
