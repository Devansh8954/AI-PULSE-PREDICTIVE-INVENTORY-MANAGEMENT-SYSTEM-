import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent {
  sidebarCollapsed = false;
  currentRoute = '';

  readonly mobileNavItems = [
    { icon: 'admin_panel_settings', route: '/dashboard', color: 'gold',   shortLabel: 'Admin'    },
    { icon: 'manage_accounts',      route: '/manager',   color: 'blue',   shortLabel: 'Manager'  },
    { icon: 'analytics',            route: '/analyst',   color: 'purple', shortLabel: 'Analyst'  },
    { icon: 'warehouse',            route: '/warehouse', color: 'green',  shortLabel: 'Warehouse'},
  ];

  constructor(private readonly router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => { this.currentRoute = e.urlAfterRedirects; });
    this.currentRoute = this.router.url;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  isActive(route: string): boolean {
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
