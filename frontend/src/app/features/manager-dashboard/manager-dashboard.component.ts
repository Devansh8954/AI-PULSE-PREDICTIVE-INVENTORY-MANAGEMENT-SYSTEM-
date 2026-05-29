import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InventoryService, InventoryRecord, PurchaseOrder } from '../../core/services/inventory.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Manager role: can Approve (PENDING→APPROVED) and Cancel (PENDING/APPROVED→CANCELLED).
 * Dispatching and receiving are handled exclusively by the Warehouse dashboard.
 */
@Component({
    selector: 'app-manager-dashboard',
    templateUrl: './manager-dashboard.component.html',
    styleUrls: ['./manager-dashboard.component.scss'],
    standalone: false
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

  // ── Status update state ────────────────────────────────────────────────────
  confirmPO:      PurchaseOrder | null = null;
  confirmAction:  'approve' | 'cancel' | null = null;
  updatingPOId:   string | null = null;
  statusError:    string = '';

  // ── Derived stats ──────────────────────────────────────────────────────────
  get stats() {
    return {
      totalSKUs:         this.stockAlerts.length,
      criticalAlerts:    this.stockAlerts.filter(a => a.quantityOnHand <= a.safetyStockLevel).length,
      pendingPOs:        this.purchaseOrders.filter(p => p.status === 'PENDING').length,
      vendorReliability: 91,
    };
  }

  // ── Table columns ──────────────────────────────────────────────────────────
  displayedAlertCols = ['sku', 'productName', 'category', 'currentStock', 'reorderPoint', 'vendor', 'status'];
  displayedPOCols    = ['poNumber', 'vendor', 'totalUnits', 'totalCost', 'status', 'createdAt', 'actions'];

  // ── New PO form ────────────────────────────────────────────────────────────
  showPOForm = false;
  poForm!: FormGroup;

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.inventoryService.alerts$.pipe(takeUntil(this.destroy$))
      .subscribe(data => this.stockAlerts = data);

    this.inventoryService.orders$.pipe(takeUntil(this.destroy$))
      .subscribe(data => this.purchaseOrders = data);

    this.inventoryService.loadingAlerts$.pipe(takeUntil(this.destroy$))
      .subscribe(v => this.loadingAlerts = v);

    this.inventoryService.loadingOrders$.pipe(takeUntil(this.destroy$))
      .subscribe(v => this.loadingOrders = v);

    this.inventoryService.loadLowStockAlerts();
    this.inventoryService.loadPurchaseOrders();

    this.inventoryService.getVendors().subscribe({
      next:  v => this.vendors = v,
      error: err => {
        const status = err?.status;
        if (status === 401 || status === 403) {
          this.apiError = '⚠️ Not authenticated. Please log in to view live data.';
        } else if (status === 429) {
          this.apiError = '⏳ Too many requests — rate limit reached. Wait a moment and refresh the page.';
        } else {
          this.apiError = '⚠️ Could not reach the backend API. Make sure the server is running on port 3000.';
        }
      }
    });
    this.inventoryService.getProducts().subscribe({
      next:  p => this.products = p,
      error: () => {}
    });

    this.buildPoForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Role helpers ───────────────────────────────────────────────────────────
  get currentRole() { return this.authService.currentUser?.role ?? 'MANAGER'; }

  /** Manager can approve a PENDING PO */
  canApprove(po: PurchaseOrder): boolean {
    return po.status === 'PENDING' && (this.currentRole === 'MANAGER' || this.currentRole === 'ADMIN');
  }

  /** Manager can cancel a PENDING or APPROVED PO */
  canCancel(po: PurchaseOrder): boolean {
    return (po.status === 'PENDING' || po.status === 'APPROVED')
      && (this.currentRole === 'MANAGER' || this.currentRole === 'ADMIN');
  }

  // ── Status Workflow ────────────────────────────────────────────────────────
  openApproveConfirm(po: PurchaseOrder): void {
    this.confirmPO     = po;
    this.confirmAction = 'approve';
    this.statusError   = '';
  }

  openCancelConfirm(po: PurchaseOrder): void {
    this.confirmPO     = po;
    this.confirmAction = 'cancel';
    this.statusError   = '';
  }

  closeConfirm(): void {
    this.confirmPO     = null;
    this.confirmAction = null;
    this.statusError   = '';
  }

  executeStatusChange(): void {
    if (!this.confirmPO || !this.confirmAction) return;

    const po        = this.confirmPO;
    const newStatus: PurchaseOrder['status'] = this.confirmAction === 'approve' ? 'APPROVED' : 'CANCELLED';

    this.updatingPOId = po.id;
    this.statusError  = '';
    this.closeConfirm();

    this.inventoryService.updatePOStatus(po.id, newStatus).subscribe({
      next: () => { this.updatingPOId = null; },
      error: (err) => {
        this.updatingPOId = null;
        const msg = err?.error?.error?.message ?? 'Failed to update purchase order status.';
        this.statusError = `⚠️ ${msg}`;
      }
    });
  }

  // ── Confirmation modal helpers ─────────────────────────────────────────────
  get confirmTitle(): string {
    if (!this.confirmPO || !this.confirmAction) return '';
    return this.confirmAction === 'approve'
      ? `Approve ${this.confirmPO.poNumber}?`
      : `Cancel ${this.confirmPO.poNumber}?`;
  }

  get confirmBody(): string {
    if (!this.confirmPO || !this.confirmAction) return '';
    const vendor = this.confirmPO.vendor?.name ?? this.confirmPO.vendorId;
    if (this.confirmAction === 'cancel') {
      return `This will permanently cancel the purchase order from ${vendor} (${this.confirmPO.totalUnits} units). This action cannot be undone.`;
    }
    return `Approve purchase order from ${vendor} for ${this.confirmPO.totalUnits} units at ₹${this.confirmPO.totalCost.toLocaleString('en-IN')}? It will be sent to the Warehouse for dispatch.`;
  }

  get confirmBtnLabel(): string {
    if (!this.confirmAction) return 'Confirm';
    return this.confirmAction === 'cancel' ? 'Yes, Cancel PO' : 'Approve & Send to Warehouse';
  }

  get confirmBtnClass(): string {
    return this.confirmAction === 'cancel' ? 'btn-danger' : 'btn-success';
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
  // NOTE: getStatusClass() and getStatusIcon() have been moved to the shared
  // StatusClassPipe and StatusIconPipe (shared/pipes/status.pipes.ts).
  // The templates now use: [ngClass]="row.status | statusClass" etc.

  getAlertStatus(record: InventoryRecord): 'critical' | 'low' | 'ok' {
    if (record.quantityOnHand <= record.safetyStockLevel) return 'critical';
    if (record.isBelowReorderPoint) return 'low';
    return 'ok';
  }
}
