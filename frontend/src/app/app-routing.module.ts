import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ShellComponent }              from './shared/components/shell/shell.component';
import { LoginComponent }              from './features/login/login.component';
import { DashboardComponent }          from './features/dashboard/dashboard.component';
import { ManagerDashboardComponent }   from './features/manager-dashboard/manager-dashboard.component';
import { AnalystDashboardComponent }   from './features/analyst-dashboard/analyst-dashboard.component';
import { WarehouseDashboardComponent } from './features/warehouse-dashboard/warehouse-dashboard.component';
import { AuthGuard }                   from './core/guards/auth.guard';
import { RoleGuard }                   from './core/guards/role.guard';

const routes: Routes = [
  // Public routes
  { path: 'login', component: LoginComponent, title: 'AI-Pulse | Sign In' },

  // Protected routes — all require login + role check
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard],
    children: [
      // Default redirect based on role is handled by the login/guard
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Admin Command Center — ADMIN only
      {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'AI-Pulse | Admin Command Center',
        canActivate: [RoleGuard],
        data: { allowedRoute: '/dashboard' },
      },

      // Manager View — MANAGER, ADMIN
      {
        path: 'manager',
        component: ManagerDashboardComponent,
        title: 'AI-Pulse | Manager View',
        canActivate: [RoleGuard],
        data: { allowedRoute: '/manager' },
      },

      // Analyst Studio — VIEWER (analyst), MANAGER, ADMIN
      {
        path: 'analyst',
        component: AnalystDashboardComponent,
        title: 'AI-Pulse | Analyst Studio',
        canActivate: [RoleGuard],
        data: { allowedRoute: '/analyst' },
      },

      // Warehouse Ops — WAREHOUSE, MANAGER, ADMIN
      {
        path: 'warehouse',
        component: WarehouseDashboardComponent,
        title: 'AI-Pulse | Warehouse Ops',
        canActivate: [RoleGuard],
        data: { allowedRoute: '/warehouse' },
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
