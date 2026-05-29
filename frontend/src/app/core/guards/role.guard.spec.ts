import { TestBed }             from '@angular/core/testing';
import { RouterTestingModule }  from '@angular/router/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { RoleGuard }    from './role.guard';
import { AuthService }  from '../services/auth.service';

/**
 * role.guard.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for RoleGuard — the per-route RBAC enforcement.
 *
 * Test matrix:
 *   ✅ ADMIN accessing /dashboard         → true
 *   ✅ WAREHOUSE accessing /dashboard     → false, redirects to /warehouse
 *   ✅ MANAGER accessing /analyst         → true (MANAGER has analyst access)
 *   ✅ VIEWER accessing /manager          → false, redirects to /analyst
 *   ✅ Route with no allowedRoute data    → true (just rely on AuthGuard)
 */
describe('RoleGuard', () => {
  let guard: RoleGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const makeRoute = (allowedRoute: string | undefined): ActivatedRouteSnapshot => {
    const snap = new ActivatedRouteSnapshot();
    (snap as any).data = allowedRoute ? { allowedRoute } : {};
    return snap;
  };

  beforeEach(() => {
    const authSpy   = jasmine.createSpyObj('AuthService', ['canAccess'], { homeRoute: '/analyst' });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports:   [RouterTestingModule],
      providers: [
        RoleGuard,
        { provide: AuthService, useValue: authSpy },
        { provide: Router,      useValue: routerSpy },
      ],
    });

    guard       = TestBed.inject(RoleGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router      = TestBed.inject(Router)      as jasmine.SpyObj<Router>;
  });

  it('should return true when canAccess() returns true for the route', () => {
    authService.canAccess.and.returnValue(true);
    expect(guard.canActivate(makeRoute('/dashboard'))).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should return false and redirect to homeRoute when canAccess() returns false', () => {
    authService.canAccess.and.returnValue(false);
    (Object.getOwnPropertyDescriptor(authService, 'homeRoute')!.get as jasmine.Spy)
      .and.returnValue('/warehouse');

    expect(guard.canActivate(makeRoute('/dashboard'))).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/warehouse']);
  });

  it('should return true when no allowedRoute is specified on route data', () => {
    expect(guard.canActivate(makeRoute(undefined))).toBeTrue();
    expect(authService.canAccess).not.toHaveBeenCalled();
  });

  it('VIEWER should be denied /manager and redirected to /analyst', () => {
    authService.canAccess.and.returnValue(false);
    (Object.getOwnPropertyDescriptor(authService, 'homeRoute')!.get as jasmine.Spy)
      .and.returnValue('/analyst');

    const result = guard.canActivate(makeRoute('/manager'));
    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/analyst']);
  });

  it('MANAGER should be allowed /analyst (canAccess returns true)', () => {
    authService.canAccess.and.returnValue(true);
    expect(guard.canActivate(makeRoute('/analyst'))).toBeTrue();
  });
});
