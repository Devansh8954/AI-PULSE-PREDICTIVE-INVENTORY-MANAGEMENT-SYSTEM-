import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {

  form: FormGroup;
  loading  = false;
  errorMsg = '';
  showPass = false;

  // Seed quick-fill credentials — matches seed.sql roles
  readonly quickLogins = [
    { label: 'Admin',     email: 'admin@aipulse.com',     role: 'ADMIN',     icon: 'admin_panel_settings' },
    { label: 'Manager',   email: 'manager1@aipulse.com',  role: 'MANAGER',   icon: 'manage_accounts' },
    { label: 'Analyst',   email: 'viewer1@aipulse.com',   role: 'VIEWER',    icon: 'analytics' },
    { label: 'Warehouse', email: 'warehouse@aipulse.com', role: 'WAREHOUSE', icon: 'warehouse' },
  ];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    // If already logged in, go straight to the role-appropriate dashboard
    if (this.auth.isLoggedIn && this.auth.currentUser) {
      this.navigateByRole(this.auth.currentUser);
    }

    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  fill(email: string): void {
    this.form.patchValue({ email, password: 'Password@123' });
    this.errorMsg = '';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading  = true;
    this.errorMsg = '';

    const { email, password } = this.form.value;

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        const user = this.auth.currentUser;
        if (user) {
          this.navigateByRole(user);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading  = false;
        const msg = err?.error?.error?.message;
        this.errorMsg = msg ?? 'Login failed. Check your credentials or ensure the backend is running.';
      },
    });
  }

  /**
   * Routes the user to the dashboard that matches their role.
   *  ADMIN     → /dashboard   (Admin Command Center)
   *  MANAGER   → /manager     (Manager View)
   *  VIEWER    → /analyst     (Analyst Studio)
   *  WAREHOUSE → /warehouse   (Warehouse Ops)
   */
  private navigateByRole(user: AuthUser): void {
    const routeMap: Record<string, string> = {
      ADMIN:     '/dashboard',
      MANAGER:   '/manager',
      VIEWER:    '/analyst',
      WAREHOUSE: '/warehouse',
    };
    this.router.navigate([routeMap[user.role] ?? '/dashboard']);
  }
}
