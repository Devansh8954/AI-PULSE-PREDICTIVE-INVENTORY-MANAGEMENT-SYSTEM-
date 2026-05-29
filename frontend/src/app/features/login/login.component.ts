import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthUser, UserRole } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    standalone: false
})
export class LoginComponent {

  /** Active tab: 'login' or 'register' */
  activeTab: 'login' | 'register' = 'login';

  loginForm: FormGroup;
  registerForm: FormGroup;

  loading  = false;
  errorMsg = '';
  successMsg = '';
  showPass = false;
  showRegPass = false;

  /** Demo accounts — matches seed.sql data */
  readonly quickLogins = [
    { label: 'Admin',     email: 'admin@aipulse.com',     role: 'ADMIN',     icon: 'admin_panel_settings' },
    { label: 'Manager',   email: 'manager1@aipulse.com',  role: 'MANAGER',   icon: 'manage_accounts' },
    { label: 'Analyst',   email: 'viewer1@aipulse.com',   role: 'VIEWER',    icon: 'analytics' },
    { label: 'Warehouse', email: 'warehouse@aipulse.com', role: 'WAREHOUSE', icon: 'warehouse' },
  ];

  /** Available roles for new registration */
  readonly registerRoles: { value: UserRole; label: string; icon: string }[] = [
    { value: 'VIEWER',    label: 'Analyst',   icon: 'analytics' },
    { value: 'WAREHOUSE', label: 'Warehouse', icon: 'warehouse' },
    { value: 'MANAGER',   label: 'Manager',   icon: 'manage_accounts' },
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

    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    this.registerForm = this.fb.group({
      name:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&]).*$/)]],
      role:     ['VIEWER', Validators.required],
    });
  }

  switchTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
    this.errorMsg  = '';
    this.successMsg = '';
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  fill(email: string): void {
    this.loginForm.patchValue({ email, password: 'Password@123' });
    this.errorMsg = '';
  }

  submitLogin(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.loading  = true;
    this.errorMsg = '';

    const { email, password } = this.loginForm.value;

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        const user = this.auth.currentUser;
        if (user) this.navigateByRole(user);
        else this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading  = false;
        const msg = err?.error?.error?.message;
        this.errorMsg = msg ?? 'Login failed. Check your credentials or ensure the backend is running.';
      },
    });
  }

  // ── Register ─────────────────────────────────────────────────────────────────

  submitRegister(): void {
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.loading   = true;
    this.errorMsg  = '';
    this.successMsg = '';

    const { name, email, password, role } = this.registerForm.value;

    this.auth.register(name, email, password, role).subscribe({
      next: () => {
        this.loading = false;
        const user = this.auth.currentUser;
        if (user) this.navigateByRole(user);
        else this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading  = false;
        const msg = err?.error?.error?.message ?? err?.error?.message;
        this.errorMsg = msg ?? 'Registration failed. Please try again.';
      },
    });
  }

  get f(): { [key: string]: AbstractControl } { return this.registerForm.controls; }

  /**
   * Routes the user to the dashboard that matches their role.
   *  ADMIN     → /dashboard  (Admin Command Center — ADMIN only)
   *  MANAGER   → /manager    (Manager View)
   *  VIEWER    → /analyst    (Analyst Studio)
   *  WAREHOUSE → /warehouse  (Warehouse Ops)
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
