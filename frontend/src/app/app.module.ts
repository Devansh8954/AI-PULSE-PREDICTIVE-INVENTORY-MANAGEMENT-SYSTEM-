import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

// ── Angular Material ──────────────────────────────────────────────────────────
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

// ── Routing & Auth ────────────────────────────────────────────────────────────
import { AppRoutingModule } from './app-routing.module';
import { AppComponent }     from './app.component';
import { AuthInterceptor }  from './core/interceptors/auth.interceptor';
import { RoleGuard }        from './core/guards/role.guard';

// ── Shared: Layout ────────────────────────────────────────────────────────────
import { SidebarComponent }    from './shared/components/sidebar/sidebar.component';
import { ShellComponent }      from './shared/components/shell/shell.component';
import { LoadingRowComponent } from './shared/components/loading-row/loading-row.component';

// ── Shared: Pipes ─────────────────────────────────────────────────────────────
import { StatusIconPipe, StatusClassPipe } from './shared/pipes/status.pipes';

// ── Feature Dashboards ────────────────────────────────────────────────────────
import { LoginComponent }              from './features/login/login.component';
import { DashboardComponent }          from './features/dashboard/dashboard.component';
import { ManagerDashboardComponent }   from './features/manager-dashboard/manager-dashboard.component';
import { AnalystDashboardComponent }   from './features/analyst-dashboard/analyst-dashboard.component';
import { WarehouseDashboardComponent } from './features/warehouse-dashboard/warehouse-dashboard.component';

@NgModule({ declarations: [
        AppComponent,
        // Layout
        ShellComponent,
        SidebarComponent,
        // Shared reusable components
        LoadingRowComponent,
        // Shared pipes
        StatusIconPipe,
        StatusClassPipe,
        // Pages
        LoginComponent,
        DashboardComponent,
        ManagerDashboardComponent,
        AnalystDashboardComponent,
        WarehouseDashboardComponent,
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        BrowserAnimationsModule,
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
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
        MatSelectModule], providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        RoleGuard,
        provideHttpClient(withInterceptorsFromDi()),
    ] })
export class AppModule {}
