import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ShellComponent }              from './shared/components/shell/shell.component';
import { LoginComponent }              from './features/login/login.component';
import { DashboardComponent }          from './features/dashboard/dashboard.component';
import { ManagerDashboardComponent }   from './features/manager-dashboard/manager-dashboard.component';
import { AnalystDashboardComponent }   from './features/analyst-dashboard/analyst-dashboard.component';
import { WarehouseDashboardComponent } from './features/warehouse-dashboard/warehouse-dashboard.component';
import { AuthGuard }                   from './core/guards/auth.guard';

const routes: Routes = [
  // Public routes
  { path: 'login', component: LoginComponent, title: 'AI-Pulse | Sign In' },

  // Protected routes — all require login
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '',           redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',  component: DashboardComponent,          title: 'AI-Pulse | Admin Command Center' },
      { path: 'manager',    component: ManagerDashboardComponent,   title: 'AI-Pulse | Manager View' },
      { path: 'analyst',    component: AnalystDashboardComponent,   title: 'AI-Pulse | Analyst Studio' },
      { path: 'warehouse',  component: WarehouseDashboardComponent, title: 'AI-Pulse | Warehouse Ops' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
