import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);

interface ForecastRow {
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  predictedDemand30d: number;
  depletionDays: number;
  confidence: number;
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

  readonly stats = {
    forecastAccuracy: 87,
    signalsAnalyzed: 1240,
    avgDepletionDays: 18,
    categoriesTracked: 12,
  };

  readonly forecastRows: ForecastRow[] = [
    { sku: 'SKU-001', productName: 'Winter Jacket Pro',   category: 'Apparel',     currentStock: 12,  predictedDemand30d: 95,  depletionDays: 4,  confidence: 94, trend: 'up'     },
    { sku: 'SKU-017', productName: 'Smart LED Bulb 9W',   category: 'Electronics', currentStock: 28,  predictedDemand30d: 120, depletionDays: 7,  confidence: 88, trend: 'up'     },
    { sku: 'SKU-034', productName: 'Yoga Mat Premium',    category: 'Sports',      currentStock: 35,  predictedDemand30d: 40,  depletionDays: 26, confidence: 72, trend: 'stable' },
    { sku: 'SKU-058', productName: 'Coffee Blend Dark',   category: 'Food',        currentStock: 44,  predictedDemand30d: 160, depletionDays: 8,  confidence: 91, trend: 'up'     },
    { sku: 'SKU-099', productName: 'Notebook Hardcover',  category: 'Stationery',  currentStock: 200, predictedDemand30d: 30,  depletionDays: 60, confidence: 65, trend: 'down'   },
    { sku: 'SKU-072', productName: 'Gaming Headset X3',   category: 'Electronics', currentStock: 5,   predictedDemand30d: 80,  depletionDays: 2,  confidence: 96, trend: 'up'     },
  ];

  displayedCols = ['sku', 'productName', 'category', 'currentStock', 'predictedDemand30d', 'depletionDays', 'confidence', 'trend'];

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.buildLineChart();
    this.buildPieChart();
  }

  ngOnDestroy(): void {
    this.lineChart?.destroy();
    this.pieChart?.destroy();
  }

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

  private buildLineChart(): void {
    const ctx = this.lineChartCanvas.nativeElement.getContext('2d')!;
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Actual Demand',
            data: [320, 410, 390, 480, 520, 610],
            borderColor: '#58a6ff',
            backgroundColor: 'rgba(88,166,255,0.1)',
            tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#58a6ff',
          },
          {
            label: 'Predicted Demand',
            data: [300, 420, 380, 500, 510, 630],
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

  private buildPieChart(): void {
    const ctx = this.pieChartCanvas.nativeElement.getContext('2d')!;
    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Electronics', 'Apparel', 'Food', 'Sports', 'Stationery', 'Other'],
        datasets: [{
          data: [35, 22, 18, 12, 8, 5],
          backgroundColor: ['rgba(88,166,255,0.7)','rgba(240,180,41,0.7)','rgba(63,185,80,0.7)','rgba(163,113,247,0.7)','rgba(248,81,73,0.7)','rgba(139,148,158,0.5)'],
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
}
