import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService, AuthUser, ROLE_ACCESS, UserRole } from '../../../core/services/auth.service';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  color: string;
  badge?: string;
}

/** All possible dashboard nav items */
const ALL_NAV_ITEMS: NavItem[] = [
  {
    label: 'Admin Command',
    icon:  'admin_panel_settings',
    route: '/dashboard',
    color: 'gold',
    badge: 'ADMIN',
  },
  {
    label: 'Manager View',
    icon:  'manage_accounts',
    route: '/manager',
    color: 'blue',
    badge: 'MGR',
  },
  {
    label: 'Analyst Studio',
    icon:  'analytics',
    route: '/analyst',
    color: 'purple',
    badge: 'ANA',
  },
  {
    label: 'Warehouse Ops',
    icon:  'warehouse',
    route: '/warehouse',
    color: 'green',
    badge: 'OPS',
  },
];

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  currentRoute = '';
  navItems: NavItem[] = [];
  currentUser: AuthUser | null = null;

  constructor(
    private readonly router: Router,
    private readonly auth: AuthService,
  ) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute = e.urlAfterRedirects;
      });
    this.currentRoute = this.router.url;
  }

  ngOnInit(): void {
    this.auth.user$.subscribe(user => {
      this.currentUser = user;
      this.navItems = this.buildNavItems(user);
    });
  }

  /** Filter nav items the current user can access */
  private buildNavItems(user: AuthUser | null): NavItem[] {
    if (!user) return [];
    const accessible = ROLE_ACCESS[user.role as UserRole] ?? [];
    return ALL_NAV_ITEMS.filter(item => accessible.includes(item.route));
  }

  get roleLabel(): string {
    if (!this.currentUser) return '';
    const map: Record<UserRole, string> = {
      ADMIN:     'Administrator',
      MANAGER:   'Manager',
      VIEWER:    'Analyst',
      WAREHOUSE: 'Warehouse',
    };
    return map[this.currentUser.role as UserRole] ?? this.currentUser.role;
  }

  get roleColor(): string {
    const map: Record<UserRole, string> = {
      ADMIN:     'gold',
      MANAGER:   'blue',
      VIEWER:    'purple',
      WAREHOUSE: 'green',
    };
    return map[(this.currentUser?.role as UserRole)] ?? 'blue';
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

  logout(): void {
    this.auth.logout();
  }
}
