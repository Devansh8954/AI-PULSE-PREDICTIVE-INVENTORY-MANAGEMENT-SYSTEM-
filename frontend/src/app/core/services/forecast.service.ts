import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ForecastResult {
  productId: string;
  sku: string;
  productName: string;
  avgTrendScore: number;         // 0.0000 – 1.0000
  currentStock: number;
  predictedDemand: number;
  demandGap: number;
  reorderPoint: number;
  alertLevel: 'CRITICAL' | 'MODERATE' | 'LOW';
  signalCount: number;
  forecastedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ForecastService {

  private readonly base: string;

  constructor(private http: HttpClient) {
    this.base = environment.apiBaseUrl;
  }

  /**
   * GET /api/v1/forecast/:productId
   * Returns a weighted demand forecast by combining active trend signals.
   */
  getForecast(productId: string): Observable<ForecastResult> {
    return this.http.get<any>(`${this.base}/forecast/${productId}`).pipe(
      map(res => res.data)
    );
  }

  /**
   * GET /api/v1/products
   * Returns the list of all active products (for looping forecast calls).
   */
  getProducts(): Observable<any[]> {
    return this.http.get<any>(`${this.base}/products?limit=100`).pipe(
      map(res => res.data ?? [])
    );
  }
}
