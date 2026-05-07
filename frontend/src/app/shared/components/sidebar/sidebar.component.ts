import { Component, Output, EventEmitter, Input } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  role: string;
  color: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  currentRoute = '';

  readonly navItems: NavItem[] = [
    {
      label: 'Admin Command',
      icon: 'admin_panel_settings',
      route: '/dashboard',
      role: 'ADMIN',
      color: 'gold',
      badge: 'ADMIN',
    },
    {
      label: 'Manager View',
      icon: 'manage_accounts',
      route: '/manager',
      role: 'MANAGER',
      color: 'blue',
      badge: 'MGR',
    },
    {
      label: 'Analyst Studio',
      icon: 'analytics',
      route: '/analyst',
      role: 'ANALYST',
      color: 'purple',
      badge: 'ANA',
    },
    {
      label: 'Warehouse Ops',
      icon: 'warehouse',
      route: '/warehouse',
      role: 'WAREHOUSE',
      color: 'green',
      badge: 'OPS',
    },
  ];

  constructor(private readonly router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute = e.urlAfterRedirects;
      });
    this.currentRoute = this.router.url;
  }

  isActive(route: string): boolean {
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  onToggle(): void {
    this.toggleCollapse.emit();
  }
}
