import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * RoleGuard — ensures the logged-in user has permission to access a route.
 * Uses the `data.roles` array from the route definition.
 *
 * Usage in routes:
 *   {
 *     path: 'dashboard',
 *     component: DashboardComponent,
 *     canActivate: [AuthGuard, RoleGuard],
 *     data: { allowedRoute: '/dashboard' }
 *   }
 *
 * If access is denied, the user is redirected to their home dashboard.
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoute: string = route.data['allowedRoute'];

    // If no allowedRoute specified, allow (just rely on AuthGuard)
    if (!allowedRoute) return true;

    if (this.auth.canAccess(allowedRoute)) {
      return true;
    }

    // Redirect to the user's own home dashboard
    this.router.navigate([this.auth.homeRoute]);
    return false;
  }
}
