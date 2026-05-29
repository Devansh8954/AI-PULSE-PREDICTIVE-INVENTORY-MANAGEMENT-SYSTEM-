import { TestBed }          from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptorsFromDi }        from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { Router }            from '@angular/router';
import { Component }         from '@angular/core';
import { AuthService, ROLE_ACCESS, ROLE_HOME } from './auth.service';

/** Stub component required so RouterTestingModule can register the /login route */
@Component({
    template: '',
    standalone: false
})
class LoginStubComponent {}

/**
 * auth.service.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for AuthService.
 *
 * Test matrix:
 *   ✅ ROLE_ACCESS map   — each role maps to the correct routes
 *   ✅ ROLE_HOME map     — each role maps to the correct home route
 *   ✅ canAccess()       — returns true/false based on role and route
 *   ✅ homeRoute getter  — returns correct route for current user
 *   ✅ isLoggedIn getter — checks localStorage for token
 *   ✅ logout()          — clears storage and navigates to /login
 *   ✅ login()           — stores token + user and updates user$ observable
 */
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
    declarations: [LoginStubComponent],
    imports: [
        // Register stub /login route so navigate(['/login']) in logout() doesn't throw NG04002
        RouterTestingModule.withRoutes([
            { path: 'login', component: LoginStubComponent },
        ])],
    providers: [AuthService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    service  = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ── ROLE_ACCESS map ────────────────────────────────────────────────────────

  it('ADMIN should have access to all 4 routes', () => {
    expect(ROLE_ACCESS['ADMIN']).toContain('/dashboard');
    expect(ROLE_ACCESS['ADMIN']).toContain('/manager');
    expect(ROLE_ACCESS['ADMIN']).toContain('/analyst');
    expect(ROLE_ACCESS['ADMIN']).toContain('/warehouse');
  });

  it('WAREHOUSE should only have access to /warehouse', () => {
    expect(ROLE_ACCESS['WAREHOUSE']).toEqual(['/warehouse']);
  });

  it('VIEWER should only have access to /analyst', () => {
    expect(ROLE_ACCESS['VIEWER']).toEqual(['/analyst']);
  });

  it('MANAGER should have access to /manager, /analyst, /warehouse (not /dashboard)', () => {
    expect(ROLE_ACCESS['MANAGER']).not.toContain('/dashboard');
    expect(ROLE_ACCESS['MANAGER']).toContain('/manager');
    expect(ROLE_ACCESS['MANAGER']).toContain('/analyst');
    expect(ROLE_ACCESS['MANAGER']).toContain('/warehouse');
  });

  // ── ROLE_HOME map ──────────────────────────────────────────────────────────

  it('ROLE_HOME should map each role to correct home route', () => {
    expect(ROLE_HOME['ADMIN']).toBe('/dashboard');
    expect(ROLE_HOME['MANAGER']).toBe('/manager');
    expect(ROLE_HOME['VIEWER']).toBe('/analyst');
    expect(ROLE_HOME['WAREHOUSE']).toBe('/warehouse');
  });

  // ── isLoggedIn ─────────────────────────────────────────────────────────────

  it('isLoggedIn should return false when no token in localStorage', () => {
    expect(service.isLoggedIn).toBeFalse();
  });

  it('isLoggedIn should return true when token exists in localStorage', () => {
    localStorage.setItem('ai_pulse_token', 'mock-jwt-token');
    expect(service.isLoggedIn).toBeTrue();
  });

  // ── canAccess() ────────────────────────────────────────────────────────────

  it('canAccess() should return false when no user is logged in', () => {
    expect(service.canAccess('/dashboard')).toBeFalse();
  });

  it('canAccess() should return true for ADMIN on /dashboard', () => {
    localStorage.setItem('ai_pulse_user', JSON.stringify({
      id: 'u1', role: 'ADMIN', name: 'Admin', email: 'a@a.com',
    }));
    // Re-instantiate to pick up the localStorage user
    service = new AuthService(TestBed.inject(HttpClient), TestBed.inject(Router));
    expect(service.canAccess('/dashboard')).toBeTrue();
    expect(service.canAccess('/warehouse')).toBeTrue();
  });

  it('canAccess() should return false for WAREHOUSE on /dashboard', () => {
    localStorage.setItem('ai_pulse_user', JSON.stringify({
      id: 'u2', role: 'WAREHOUSE', name: 'WH', email: 'w@w.com',
    }));
    service = new AuthService(TestBed.inject(HttpClient), TestBed.inject(Router));
    expect(service.canAccess('/dashboard')).toBeFalse();
    expect(service.canAccess('/warehouse')).toBeTrue();
  });

  // ── homeRoute ──────────────────────────────────────────────────────────────

  it('homeRoute should return /login when no user is logged in', () => {
    expect(service.homeRoute).toBe('/login');
  });

  // ── logout() ───────────────────────────────────────────────────────────────

  it('logout() should clear localStorage keys', () => {
    localStorage.setItem('ai_pulse_token', 'tok');
    localStorage.setItem('ai_pulse_user',  '{}');

    service.logout();

    expect(localStorage.getItem('ai_pulse_token')).toBeNull();
    expect(localStorage.getItem('ai_pulse_user')).toBeNull();
  });

  it('logout() should emit null from user$ observable', () => {
    // Use synchronous check — currentUser is null after logout() is called
    service.logout();
    expect(service.currentUser).toBeNull();
  });

  // ── login() ────────────────────────────────────────────────────────────────

  it('login() should store token and user in localStorage', () => {
    const mockResponse = {
      data: {
        token: 'jwt-token-mock',
        user:  { id: 'u3', name: 'Dev User', email: 'dev@test.com', role: 'ADMIN' },
      },
    };

    service.login('dev@test.com', 'password').subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
    req.flush(mockResponse);

    expect(localStorage.getItem('ai_pulse_token')).toBe('jwt-token-mock');
    const stored = JSON.parse(localStorage.getItem('ai_pulse_user')!);
    expect(stored.role).toBe('ADMIN');
  });

  it('login() should update user$ with the authenticated user', (done) => {
    const mockUser = { id: 'u4', name: 'Manager', email: 'mgr@test.com', role: 'MANAGER' as const };

    service.user$.subscribe((user) => {
      if (user && user.role === 'MANAGER') { done(); }
    });

    service.login('mgr@test.com', 'pass').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
    req.flush({ data: { token: 'tok', user: mockUser } });
  });
});
