import { Component, OnInit } from '@angular/core';

interface StockAlert {
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  vendor: string;
  status: 'critical' | 'low' | 'ok';
}

interface PurchaseOrder {
  poId: string;
  vendor: string;
  items: number;
  totalUnits: number;
  status: 'pending' | 'approved' | 'dispatched';
  createdAt: string;
}

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.scss'],
})
export class ManagerDashboardComponent implements OnInit {

  readonly stats = {
    totalSKUs: 142,
    criticalAlerts: 8,
    pendingPOs: 5,
    vendorReliability: 91,
  };

  readonly stockAlerts: StockAlert[] = [
    { sku: 'SKU-001', productName: 'Winter Jacket Pro', category: 'Apparel',    currentStock: 12, reorderPoint: 50, vendor: 'FabricWorld',   status: 'critical' },
    { sku: 'SKU-017', productName: 'Smart LED Bulb 9W', category: 'Electronics', currentStock: 28, reorderPoint: 60, vendor: 'TechSupply',    status: 'critical' },
    { sku: 'SKU-034', productName: 'Yoga Mat Premium',  category: 'Sports',     currentStock: 35, reorderPoint: 40, vendor: 'SportZone',     status: 'low'      },
    { sku: 'SKU-058', productName: 'Coffee Blend Dark', category: 'Food',       currentStock: 44, reorderPoint: 80, vendor: 'BrewHouse Co',  status: 'low'      },
    { sku: 'SKU-072', productName: 'Gaming Headset X3', category: 'Electronics', currentStock: 5,  reorderPoint: 30, vendor: 'GadgetPro',    status: 'critical' },
  ];

  readonly purchaseOrders: PurchaseOrder[] = [
    { poId: 'PO-2024-001', vendor: 'FabricWorld',  items: 3, totalUnits: 500,  status: 'approved',   createdAt: '2 hrs ago' },
    { poId: 'PO-2024-002', vendor: 'TechSupply',   items: 5, totalUnits: 1200, status: 'pending',    createdAt: '4 hrs ago' },
    { poId: 'PO-2024-003', vendor: 'SportZone',    items: 2, totalUnits: 300,  status: 'dispatched', createdAt: '1 day ago' },
    { poId: 'PO-2024-004', vendor: 'BrewHouse Co', items: 1, totalUnits: 800,  status: 'pending',    createdAt: '1 day ago' },
  ];

  displayedAlertCols = ['sku', 'productName', 'category', 'currentStock', 'reorderPoint', 'vendor', 'status'];
  displayedPOCols    = ['poId', 'vendor', 'items', 'totalUnits', 'status', 'createdAt'];

  ngOnInit(): void {}

  getStatusClass(status: string): string {
    const map: Record<string, string> = { critical: 'badge--red', low: 'badge--gold', ok: 'badge--green', pending: 'badge--gold', approved: 'badge--blue', dispatched: 'badge--green' };
    return map[status] ?? '';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = { critical: 'error', low: 'warning_amber', ok: 'check_circle', pending: 'schedule', approved: 'thumb_up', dispatched: 'local_shipping' };
    return map[status] ?? 'info';
  }
}
