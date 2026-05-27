import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface InventoryRecord {
  id: string;
  productId: string;
  vendorId: string;
  warehouseLocation: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityOnOrder: number;
  quantityAvailable: number;
  safetyStockLevel: number;
  reorderPoint: number;
  reorderQuantity: number;
  isBelowReorderPoint: boolean;
  product?: { id: string; sku: string; name: string; category: string; brand: string };
  vendor?:  { id: string; name: string };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  lineItems: { productId: string; quantity: number; unitCost: number }[];
  totalUnits: number;
  totalCost: number;
  status: 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
  expectedDeliveryDate?: string;
  createdAt: string;
  vendor?: { id: string; name: string };
}

export interface CreatePOPayload {
  vendorId: string;
  lineItems: { productId: string; quantity: number; unitCost: number }[];
  notes?: string;
  expectedDeliveryDate?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {

  // ── Low-stock alerts ────────────────────────────────────────────────────────
  private readonly _alerts$    = new BehaviorSubject<InventoryRecord[]>([]);
  private readonly _loadingAlerts$ = new BehaviorSubject<boolean>(false);

  readonly alerts$        = this._alerts$.asObservable();
  readonly loadingAlerts$ = this._loadingAlerts$.asObservable();

  // ── Purchase orders ─────────────────────────────────────────────────────────
  private readonly _orders$    = new BehaviorSubject<PurchaseOrder[]>([]);
  private readonly _loadingOrders$ = new BehaviorSubject<boolean>(false);

  readonly orders$        = this._orders$.asObservable();
  readonly loadingOrders$ = this._loadingOrders$.asObservable();

  private readonly base: string;

  constructor(private http: HttpClient) {
    this.base = environment.apiBaseUrl;
  }

  // ── Load low-stock alerts: GET /api/v1/inventory?lowStock=true ──────────────
  loadLowStockAlerts(): void {
    this._loadingAlerts$.next(true);
    const params = new HttpParams().set('lowStock', 'true').set('limit', '50');

    this.http.get<any>(`${this.base}/inventory`, { params })
      .pipe(
        map(res => res.data ?? []),
        tap(data => this._alerts$.next(data)),
        catchError(err => { console.error('[InventoryService] alerts error', err); return throwError(() => err); }),
        finalize(() => this._loadingAlerts$.next(false))
      ).subscribe();
  }

  // ── Load purchase orders: GET /api/v1/purchase-orders ──────────────────────
  loadPurchaseOrders(status?: string): void {
    this._loadingOrders$.next(true);
    let params = new HttpParams();
    if (status) params = params.set('status', status);

    this.http.get<any>(`${this.base}/purchase-orders`, { params })
      .pipe(
        map(res => res.data ?? []),
        tap(data => this._orders$.next(data)),
        catchError(err => { console.error('[InventoryService] PO load error', err); return throwError(() => err); }),
        finalize(() => this._loadingOrders$.next(false))
      ).subscribe();
  }

  // ── Create purchase order: POST /api/v1/purchase-orders ────────────────────
  createPurchaseOrder(payload: CreatePOPayload): Observable<PurchaseOrder> {
    return this.http.post<any>(`${this.base}/purchase-orders`, payload).pipe(
      map(res => res.data),
      tap(() => this.loadPurchaseOrders()), // refresh list
      catchError(err => { console.error('[InventoryService] create PO error', err); return throwError(() => err); })
    );
  }

  // ── Update PO status: PATCH /api/v1/purchase-orders/:id/status ────────────
  updatePOStatus(id: string, status: PurchaseOrder['status']): Observable<PurchaseOrder> {
    return this.http.patch<any>(`${this.base}/purchase-orders/${id}/status`, { status }).pipe(
      map(res => res.data),
      tap(() => this.loadPurchaseOrders()), // refresh list after status change
      catchError(err => { console.error('[InventoryService] update PO status error', err); return throwError(() => err); })
    );
  }

  // ── Get vendors for the PO form dropdown ───────────────────────────────────
  getVendors(): Observable<any[]> {
    return this.http.get<any>(`${this.base}/vendors`).pipe(
      map(res => res.data ?? [])
    );
  }

  // ── Get products for the PO form line items ────────────────────────────────
  getProducts(): Observable<any[]> {
    return this.http.get<any>(`${this.base}/products`).pipe(
      map(res => res.data ?? [])
    );
  }

  // ── Load ALL purchase orders as Observable (used by Warehouse dashboard) ────────
  loadAllPurchaseOrders(limit = 50): Observable<PurchaseOrder[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any>(`${this.base}/purchase-orders`, { params }).pipe(
      map(res => res.data ?? []),
      catchError(err => { console.error('[InventoryService] all PO error', err); return throwError(() => err); })
    );
  }

  // ── Load ALL inventory records (no low-stock filter) — used by Warehouse ────
  loadAllInventory(limit = 100): Observable<InventoryRecord[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any>(`${this.base}/inventory`, { params }).pipe(
      map(res => res.data ?? []),
      catchError(err => { console.error('[InventoryService] all inventory error', err); return throwError(() => err); })
    );
  }
}
