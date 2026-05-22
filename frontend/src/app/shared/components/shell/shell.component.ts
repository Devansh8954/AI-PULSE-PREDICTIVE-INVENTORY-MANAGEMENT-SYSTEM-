import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService, ROLE_ACCESS, UserRole } from '../../../core/services/auth.service';

interface MobileNavItem {
  icon: string;
  route: string;
  color: string;
  shortLabel: string;
}

const ALL_MOBILE_NAV: MobileNavItem[] = [
  { icon: 'admin_panel_settings', route: '/dashboard', color: 'gold',   shortLabel: 'Admin'     },
  { icon: 'manage_accounts',      route: '/manager',   color: 'blue',   shortLabel: 'Manager'   },
  { icon: 'analytics',            route: '/analyst',   color: 'purple', shortLabel: 'Analyst'   },
  { icon: 'warehouse',            route: '/warehouse', color: 'green',  shortLabel: 'Warehouse' },
];

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit {
  sidebarCollapsed = false;
  currentRoute = '';
  mobileNavItems: MobileNavItem[] = [];

  constructor(
    private readonly router: Router,
    readonly auth: AuthService,
  ) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => { this.currentRoute = e.urlAfterRedirects; });
    this.currentRoute = this.router.url;
  }

  ngOnInit(): void {
    this.auth.user$.subscribe(user => {
      if (!user) { this.mobileNavItems = []; return; }
      const accessible = ROLE_ACCESS[user.role as UserRole] ?? [];
      this.mobileNavItems = ALL_MOBILE_NAV.filter(item => accessible.includes(item.route));
    });
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

  logout(): void {
    this.auth.logout();
  }
}
