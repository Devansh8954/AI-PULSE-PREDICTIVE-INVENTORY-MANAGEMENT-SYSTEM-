import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { InventoryService, InventoryRecord } from '../../core/services/inventory.service';

/** Flattened row for the warehouse table — derived from InventoryRecord */
export interface WarehouseItem {
  id: string;
  sku: string;
  productName: string;
  location: string;
  zone: string;
  currentStock: number;
  capacity: number;        // reorderQuantity × 3 — estimated max capacity
  vendorName: string;
  category: string;
  action: 'restock' | 'pick' | 'idle';
  safetyStockLevel: number;
  reorderPoint: number;
}

@Component({
  selector: 'app-warehouse-dashboard',
  templateUrl: './warehouse-dashboard.component.html',
  styleUrls: ['./warehouse-dashboard.component.scss'],
})
export class WarehouseDashboardComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── State ─────────────────────────────────────────────────────────────────────
  isLoading    = true;
  apiError     = '';
  warehouseItems: WarehouseItem[] = [];

  // ── Computed stats from live data ─────────────────────────────────────────────
  get stats() {
    const locations  = new Set(this.warehouseItems.map(i => i.location)).size;
    const zones      = new Set(this.warehouseItems.map(i => i.zone)).size;
    const restocks   = this.warehouseItems.filter(i => i.action === 'restock').length;
    const total      = this.warehouseItems.length;
    return {
      totalLocations: locations,
      activeZones:    zones,
      todayRestocks:  restocks,
      totalSKUs:      total,
    };
  }

  displayedItemCols = [
    'sku', 'productName', 'location', 'zone',
    'currentStock', 'capacity', 'vendorName', 'action'
  ];

  constructor(private inventoryService: InventoryService) {}

  ngOnInit(): void {
    this.loadInventory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRefresh(): void {
    this.loadInventory();
  }

  // ── View helpers ──────────────────────────────────────────────────────────────

  getCapacityPct(item: WarehouseItem): number {
    if (!item.capacity) return 0;
    return Math.min(Math.round((item.currentStock / item.capacity) * 100), 100);
  }

  getActionClass(action: string): string {
    return { restock: 'badge--red', pick: 'badge--blue', idle: 'badge--muted' }[action] ?? '';
  }

  getActionIcon(action: string): string {
    return { restock: 'move_to_inbox', pick: 'output', idle: 'check' }[action] ?? 'info';
  }

  getCapacityClass(pct: number): string {
    if (pct >= 60) return 'cap-bar--green';
    if (pct >= 25) return 'cap-bar--gold';
    return 'cap-bar--red';
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private loadInventory(): void {
    this.isLoading = true;
    this.apiError  = '';

    this.inventoryService.loadAllInventory(100)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.apiError = this.getErrorMessage(err);
          this.isLoading = false;
          return of([]);
        })
      )
      .subscribe((records: InventoryRecord[]) => {
        this.warehouseItems = records.map(r => this.toWarehouseItem(r));
        this.isLoading = false;
      });
  }

  private toWarehouseItem(r: InventoryRecord): WarehouseItem {
    const action: 'restock' | 'pick' | 'idle' =
      r.isBelowReorderPoint ? 'restock' :
      r.quantityOnHand > (r.reorderPoint * 2) ? 'pick' : 'idle';

    // Derive a zone label from warehouse location e.g. "WH-DELHI-01" → "DELHI"
    const locParts = (r.warehouseLocation ?? 'UNKNOWN').split('-');
    const zone = locParts.length >= 2 ? locParts[1] : 'MAIN';

    return {
      id:               r.id,
      sku:              r.product?.sku        ?? '—',
      productName:      r.product?.name       ?? '—',
      location:         r.warehouseLocation,
      zone,
      currentStock:     r.quantityOnHand,
      capacity:         r.reorderQuantity * 3,
      vendorName:       r.vendor?.name        ?? '—',
      category:         r.product?.category   ?? '—',
      action,
      safetyStockLevel: r.safetyStockLevel,
      reorderPoint:     r.reorderPoint,
    };
  }

  private getErrorMessage(err: any): string {
    const status = err?.status;
    if (status === 401 || status === 403) return '⚠️ Not authenticated. Please log in to view live data.';
    return '⚠️ Could not reach the backend. Make sure the server is running on port 3000.';
  }
}
