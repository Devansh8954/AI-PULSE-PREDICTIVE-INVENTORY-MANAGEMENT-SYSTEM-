import { Component, OnInit } from '@angular/core';

interface WarehouseItem {
  sku: string;
  productName: string;
  location: string;
  zone: string;
  currentStock: number;
  capacity: number;
  lastUpdated: string;
  action: 'restock' | 'pick' | 'idle';
}

interface AuditEntry {
  timestamp: string;
  sku: string;
  action: string;
  qty: number;
  operator: string;
  type: 'in' | 'out' | 'adjust';
}

@Component({
  selector: 'app-warehouse-dashboard',
  templateUrl: './warehouse-dashboard.component.html',
  styleUrls: ['./warehouse-dashboard.component.scss'],
})
export class WarehouseDashboardComponent implements OnInit {

  readonly stats = {
    totalLocations: 48,
    activeZones: 6,
    todayRestocks: 14,
    auditEntries: 312,
  };

  readonly warehouseItems: WarehouseItem[] = [
    { sku: 'SKU-001', productName: 'Winter Jacket Pro',  location: 'A-01-03', zone: 'Zone A', currentStock: 12,  capacity: 200, lastUpdated: '10 min ago',  action: 'restock' },
    { sku: 'SKU-017', productName: 'Smart LED Bulb 9W',  location: 'B-02-07', zone: 'Zone B', currentStock: 28,  capacity: 500, lastUpdated: '25 min ago',  action: 'restock' },
    { sku: 'SKU-034', productName: 'Yoga Mat Premium',   location: 'C-05-01', zone: 'Zone C', currentStock: 35,  capacity: 100, lastUpdated: '1 hr ago',    action: 'idle'    },
    { sku: 'SKU-058', productName: 'Coffee Blend Dark',  location: 'D-03-09', zone: 'Zone D', currentStock: 44,  capacity: 300, lastUpdated: '2 hrs ago',   action: 'pick'    },
    { sku: 'SKU-072', productName: 'Gaming Headset X3',  location: 'B-01-02', zone: 'Zone B', currentStock: 5,   capacity: 150, lastUpdated: '5 min ago',   action: 'restock' },
    { sku: 'SKU-099', productName: 'Notebook Hardcover', location: 'A-04-11', zone: 'Zone A', currentStock: 200, capacity: 250, lastUpdated: '3 hrs ago',   action: 'pick'    },
  ];

  readonly auditLog: AuditEntry[] = [
    { timestamp: '16:10', sku: 'SKU-001', action: 'Restock Received',     qty: 200, operator: 'Ravi K.',   type: 'in'     },
    { timestamp: '15:55', sku: 'SKU-072', action: 'Pick for Dispatch',    qty: -15, operator: 'Priya S.',  type: 'out'    },
    { timestamp: '15:30', sku: 'SKU-058', action: 'Stock Count Adjusted', qty: -3,  operator: 'System',    type: 'adjust' },
    { timestamp: '14:45', sku: 'SKU-017', action: 'Restock Received',     qty: 100, operator: 'Anuj M.',   type: 'in'     },
    { timestamp: '14:00', sku: 'SKU-034', action: 'Pick for Dispatch',    qty: -20, operator: 'Priya S.',  type: 'out'    },
  ];

  displayedItemCols  = ['sku', 'productName', 'location', 'zone', 'currentStock', 'capacity', 'lastUpdated', 'action'];
  displayedAuditCols = ['timestamp', 'sku', 'action', 'qty', 'operator', 'type'];

  ngOnInit(): void {}

  getCapacityPct(item: WarehouseItem): number {
    return Math.round((item.currentStock / item.capacity) * 100);
  }

  getActionClass(action: string): string {
    return { restock: 'badge--red', pick: 'badge--blue', idle: 'badge--muted' }[action] ?? '';
  }

  getActionIcon(action: string): string {
    return { restock: 'move_to_inbox', pick: 'output', idle: 'check' }[action] ?? 'info';
  }

  getAuditTypeClass(type: string): string {
    return { in: 'badge--green', out: 'badge--gold', adjust: 'badge--muted' }[type] ?? '';
  }

  getAuditTypeIcon(type: string): string {
    return { in: 'arrow_downward', out: 'arrow_upward', adjust: 'tune' }[type] ?? 'info';
  }
}
