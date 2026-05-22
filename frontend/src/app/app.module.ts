import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

// ── Angular Material Modules ─────────────────────────────────────────────────
import { MatTableModule }           from '@angular/material/table';
import { MatSortModule }            from '@angular/material/sort';
import { MatInputModule }           from '@angular/material/input';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatChipsModule }           from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule }        from '@angular/material/snack-bar';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatSelectModule }          from '@angular/material/select';
import { FormsModule }              from '@angular/forms';

// ── App files ────────────────────────────────────────────────────────────────
import { AppRoutingModule }  from './app-routing.module';
import { AppComponent }      from './app.component';
import { AuthInterceptor }   from './core/interceptors/auth.interceptor';
import { RoleGuard }         from './core/guards/role.guard';

// ── Feature Components ───────────────────────────────────────────────────────
import { DashboardComponent }          from './features/dashboard/dashboard.component';
import { ManagerDashboardComponent }   from './features/manager-dashboard/manager-dashboard.component';
import { AnalystDashboardComponent }   from './features/analyst-dashboard/analyst-dashboard.component';
import { WarehouseDashboardComponent } from './features/warehouse-dashboard/warehouse-dashboard.component';
import { LoginComponent }              from './features/login/login.component';

// ── Shared Components ─────────────────────────────────────────────────────────
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ShellComponent }   from './shared/components/shell/shell.component';

@NgModule({
  declarations: [
    AppComponent,
    // Layout
    ShellComponent,
    SidebarComponent,
    // Dashboards
    DashboardComponent,
    ManagerDashboardComponent,
    AnalystDashboardComponent,
    WarehouseDashboardComponent,
    // Auth
    LoginComponent,
  ],
  imports: [
    // Angular core
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,

    // Angular Material
    MatTableModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSelectModule,
    FormsModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    RoleGuard,
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
