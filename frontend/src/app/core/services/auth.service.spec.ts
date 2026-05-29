import { TestBed }          from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService, ROLE_ACCESS, ROLE_HOME } from './auth.service';

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
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [AuthService],
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

  it('canAccess() should return true for ADMIN on any route', () => {
    localStorage.setItem('ai_pulse_user', JSON.stringify({ id: 'u1', role: 'ADMIN', name: 'Admin', email: 'a@a.com' }));
    // Re-instantiate to reload user from localStorage
    service = new (AuthService as any)(
      TestBed.inject(require('@angular/common/http').HttpClient),
      TestBed.inject(require('@angular/router').Router),
    );
    expect(service.canAccess('/dashboard')).toBeTrue();
    expect(service.canAccess('/warehouse')).toBeTrue();
  });

  it('canAccess() should return false for WAREHOUSE on /dashboard', () => {
    localStorage.setItem('ai_pulse_user', JSON.stringify({ id: 'u2', role: 'WAREHOUSE', name: 'WH', email: 'w@w.com' }));
    service = new (AuthService as any)(
      TestBed.inject(require('@angular/common/http').HttpClient),
      TestBed.inject(require('@angular/router').Router),
    );
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

  it('logout() should emit null from user$ observable', (done) => {
    service.user$.subscribe((user) => {
      if (user === null) { done(); }
    });
    service.logout();
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
