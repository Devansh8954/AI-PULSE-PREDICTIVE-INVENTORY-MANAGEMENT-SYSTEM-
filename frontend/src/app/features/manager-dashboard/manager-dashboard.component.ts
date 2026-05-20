import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InventoryService, InventoryRecord, PurchaseOrder } from '../../core/services/inventory.service';

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.scss'],
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Live data from API ─────────────────────────────────────────────────────
  stockAlerts:    InventoryRecord[] = [];
  purchaseOrders: PurchaseOrder[]   = [];
  vendors:  any[] = [];
  products: any[] = [];

  // ── Loading states ─────────────────────────────────────────────────────────
  loadingAlerts = true;
  loadingOrders = true;
  submittingPO  = false;
  poError       = '';
  apiError      = '';

  // ── Derived stats ──────────────────────────────────────────────────────────
  get stats() {
    return {
      totalSKUs:         this.stockAlerts.length,
      criticalAlerts:    this.stockAlerts.filter(a => a.quantityOnHand <= a.safetyStockLevel).length,
      pendingPOs:        this.purchaseOrders.filter(p => p.status === 'PENDING').length,
      vendorReliability: 91, // static KPI — extend with real data when vendor ratings are available
    };
  }

  // ── Table columns ──────────────────────────────────────────────────────────
  displayedAlertCols = ['sku', 'productName', 'category', 'currentStock', 'reorderPoint', 'vendor', 'status'];
  displayedPOCols    = ['poNumber', 'vendor', 'totalUnits', 'totalCost', 'status', 'createdAt'];

  // ── New PO form ────────────────────────────────────────────────────────────
  showPOForm = false;
  poForm!: FormGroup;

  constructor(
    private inventoryService: InventoryService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    // Subscribe to reactive streams
    this.inventoryService.alerts$.pipe(takeUntil(this.destroy$))
      .subscribe(data => this.stockAlerts = data);

    this.inventoryService.orders$.pipe(takeUntil(this.destroy$))
      .subscribe(data => this.purchaseOrders = data);

    this.inventoryService.loadingAlerts$.pipe(takeUntil(this.destroy$))
      .subscribe(v => this.loadingAlerts = v);

    this.inventoryService.loadingOrders$.pipe(takeUntil(this.destroy$))
      .subscribe(v => this.loadingOrders = v);

    // Fetch real data — apiError shown if backend unreachable or not authenticated
    this.inventoryService.loadLowStockAlerts();
    this.inventoryService.loadPurchaseOrders();

    // Pre-load vendors & products for the PO form
    this.inventoryService.getVendors().subscribe({
      next:  v => this.vendors = v,
      error: err => {
        const status = err?.status;
        if (status === 401 || status === 403) {
          this.apiError = '⚠️ Not authenticated. Please log in to view live data.';
        } else {
          this.apiError = '⚠️ Could not reach the backend API. Make sure the server is running on port 3000.';
        }
      }
    });
    this.inventoryService.getProducts().subscribe({
      next:  p => this.products = p,
      error: () => {}  // already handled above
    });

    this.buildPoForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── PO Form helpers ────────────────────────────────────────────────────────
  private buildPoForm(): void {
    this.poForm = this.fb.group({
      vendorId:             ['', Validators.required],
      notes:                [''],
      expectedDeliveryDate: [''],
      lineItems: this.fb.array([this.newLineItem()]),
    });
  }

  get lineItems(): FormArray {
    return this.poForm.get('lineItems') as FormArray;
  }

  newLineItem(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      quantity:  [1, [Validators.required, Validators.min(1)]],
      unitCost:  [0, Validators.min(0)],
    });
  }

  addLineItem(): void   { this.lineItems.push(this.newLineItem()); }
  removeLineItem(i: number): void { if (this.lineItems.length > 1) this.lineItems.removeAt(i); }

  openNewPO(): void {
    this.showPOForm = true;
    this.poError = '';
    this.buildPoForm();
  }

  cancelPO(): void { this.showPOForm = false; }

  submitPO(): void {
    if (this.poForm.invalid) { this.poForm.markAllAsTouched(); return; }
    this.submittingPO = true;
    this.poError = '';

    this.inventoryService.createPurchaseOrder(this.poForm.value).subscribe({
      next: () => {
        this.submittingPO = false;
        this.showPOForm   = false;
        this.buildPoForm();
      },
      error: (err) => {
        this.submittingPO = false;
        this.poError = err?.error?.error?.message ?? 'Failed to create purchase order.';
      }
    });
  }

  // ── Status helpers ─────────────────────────────────────────────────────────
  getAlertStatus(record: InventoryRecord): 'critical' | 'low' | 'ok' {
    if (record.quantityOnHand <= record.safetyStockLevel) return 'critical';
    if (record.isBelowReorderPoint) return 'low';
    return 'ok';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      critical: 'badge--red', low: 'badge--gold', ok: 'badge--green',
      PENDING: 'badge--gold', APPROVED: 'badge--blue',
      DISPATCHED: 'badge--green', RECEIVED: 'badge--green', CANCELLED: 'badge--red',
    };
    return map[status] ?? '';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      critical: 'error', low: 'warning_amber', ok: 'check_circle',
      PENDING: 'schedule', APPROVED: 'thumb_up',
      DISPATCHED: 'local_shipping', RECEIVED: 'inventory', CANCELLED: 'cancel',
    };
    return map[status] ?? 'info';
  }
}
