import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { InventoryService, InventoryRecord, PurchaseOrder } from '../../core/services/inventory.service';

/** Flattened row for the warehouse bin table */
export interface WarehouseItem {
  id: string;
  sku: string;
  productName: string;
  location: string;
  zone: string;
  currentStock: number;
  capacity: number;
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

  // ── Bin inventory state ────────────────────────────────────────────────────
  isLoading    = true;
  apiError     = '';
  warehouseItems: WarehouseItem[] = [];

  // ── PO state (WAREHOUSE handles: Dispatch + Receive) ──────────────────────
  purchaseOrders:  PurchaseOrder[] = [];
  loadingOrders    = true;
  updatingPOId:    string | null = null;
  poStatusError:   string = '';
  confirmPO:       PurchaseOrder | null = null;
  confirmAction:   'dispatch' | 'receive' | null = null;

  // ── Computed stats from live data ──────────────────────────────────────────
  get stats() {
    const locations = new Set(this.warehouseItems.map(i => i.location)).size;
    const zones     = new Set(this.warehouseItems.map(i => i.zone)).size;
    const restocks  = this.warehouseItems.filter(i => i.action === 'restock').length;
    const total     = this.warehouseItems.length;
    return { totalLocations: locations, activeZones: zones, todayRestocks: restocks, totalSKUs: total };
  }

  /** POs that warehouse needs to act on: APPROVED (dispatch) or DISPATCHED (receive) */
  get actionablePOs(): PurchaseOrder[] {
    return this.purchaseOrders.filter(p => p.status === 'APPROVED' || p.status === 'DISPATCHED');
  }

  get pendingDispatch(): number  { return this.purchaseOrders.filter(p => p.status === 'APPROVED').length; }
  get inTransit(): number        { return this.purchaseOrders.filter(p => p.status === 'DISPATCHED').length; }

  displayedItemCols = ['sku', 'productName', 'location', 'zone', 'currentStock', 'capacity', 'vendorName', 'action'];
  displayedPOCols   = ['poNumber', 'vendor', 'totalUnits', 'totalCost', 'status', 'createdAt', 'wh_actions'];

  constructor(private inventoryService: InventoryService) {}

  ngOnInit(): void {
    this.loadInventory();
    this.loadPOs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRefresh(): void {
    this.loadInventory();
    this.loadPOs();
  }

  // ── PO workflow ────────────────────────────────────────────────────────────

  openDispatchConfirm(po: PurchaseOrder): void {
    this.confirmPO     = po;
    this.confirmAction = 'dispatch';
    this.poStatusError = '';
  }

  openReceiveConfirm(po: PurchaseOrder): void {
    this.confirmPO     = po;
    this.confirmAction = 'receive';
    this.poStatusError = '';
  }

  closeConfirm(): void {
    this.confirmPO     = null;
    this.confirmAction = null;
  }

  executeStatusChange(): void {
    if (!this.confirmPO || !this.confirmAction) return;

    const po        = this.confirmPO;
    const newStatus: PurchaseOrder['status'] = this.confirmAction === 'dispatch' ? 'DISPATCHED' : 'RECEIVED';

    this.updatingPOId = po.id;
    this.poStatusError = '';
    this.closeConfirm();

    this.inventoryService.updatePOStatus(po.id, newStatus).subscribe({
      next: () => {
        this.updatingPOId = null;
        this.loadPOs(); // refresh full list
      },
      error: (err) => {
        this.updatingPOId = null;
        const msg = err?.error?.error?.message ?? 'Failed to update PO status.';
        this.poStatusError = `⚠️ ${msg}`;
      }
    });
  }

  get confirmTitle(): string {
    if (!this.confirmPO || !this.confirmAction) return '';
    return this.confirmAction === 'dispatch'
      ? `Dispatch ${this.confirmPO.poNumber}?`
      : `Confirm Receipt — ${this.confirmPO.poNumber}?`;
  }

  get confirmBody(): string {
    if (!this.confirmPO || !this.confirmAction) return '';
    const vendor = this.confirmPO.vendor?.name ?? this.confirmPO.vendorId;
    if (this.confirmAction === 'dispatch') {
      return `Mark PO from ${vendor} (${this.confirmPO.totalUnits} units) as dispatched? This means the goods have left the vendor's facility.`;
    }
    return `Confirm that goods from ${vendor} (${this.confirmPO.totalUnits} units) have been received and logged in the warehouse?`;
  }

  get confirmBtnLabel(): string {
    return this.confirmAction === 'dispatch' ? 'Mark Dispatched' : 'Confirm Receipt';
  }

  // ── Status helpers ─────────────────────────────────────────────────────────
  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge--gold', APPROVED: 'badge--blue',
      DISPATCHED: 'badge--purple', RECEIVED: 'badge--green', CANCELLED: 'badge--red',
    };
    return map[status] ?? '';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'schedule', APPROVED: 'thumb_up',
      DISPATCHED: 'local_shipping', RECEIVED: 'inventory', CANCELLED: 'cancel',
    };
    return map[status] ?? 'info';
  }

  // ── Bin inventory helpers ──────────────────────────────────────────────────
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

  // ── Private loaders ────────────────────────────────────────────────────────
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

  private loadPOs(): void {
    this.loadingOrders = true;
    this.inventoryService.loadAllPurchaseOrders()
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.poStatusError = this.getErrorMessage(err);
          this.loadingOrders = false;
          return of([]);
        })
      )
      .subscribe((orders: PurchaseOrder[]) => {
        this.purchaseOrders = orders;
        this.loadingOrders = false;
      });
  }

  private toWarehouseItem(r: InventoryRecord): WarehouseItem {
    const action: 'restock' | 'pick' | 'idle' =
      r.isBelowReorderPoint ? 'restock' :
      r.quantityOnHand > (r.reorderPoint * 2) ? 'pick' : 'idle';

    const locParts = (r.warehouseLocation ?? 'UNKNOWN').split('-');
    const zone = locParts.length >= 2 ? locParts[1] : 'MAIN';

    return {
      id: r.id, sku: r.product?.sku ?? '—', productName: r.product?.name ?? '—',
      location: r.warehouseLocation, zone,
      currentStock: r.quantityOnHand, capacity: r.reorderQuantity * 3,
      vendorName: r.vendor?.name ?? '—', category: r.product?.category ?? '—',
      action, safetyStockLevel: r.safetyStockLevel, reorderPoint: r.reorderPoint,
    };
  }

  private getErrorMessage(err: any): string {
    const status = err?.status;
    if (status === 401 || status === 403) return '⚠️ Not authenticated. Please log in to view live data.';
    if (status === 429) return '⏳ Too many requests — rate limit reached. Wait a moment and click Refresh.';
    return '⚠️ Could not reach the backend. Make sure the server is running on port 3000.';
  }
}
