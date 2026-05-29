import { TestBed }    from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router }     from '@angular/router';
import { AuthGuard }  from './auth.guard';
import { AuthService } from '../services/auth.service';

/**
 * auth.guard.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for AuthGuard.
 *
 * Test matrix:
 *   ✅ Logged-in user    → canActivate returns true
 *   ✅ Unauthenticated   → canActivate returns false AND navigates to /login
 */
describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy   = jasmine.createSpyObj('AuthService', ['canAccess'], { isLoggedIn: false });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports:   [RouterTestingModule],
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authSpy },
        { provide: Router,      useValue: routerSpy },
      ],
    });

    guard       = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router      = TestBed.inject(Router)      as jasmine.SpyObj<Router>;
  });

  it('should return true when the user is logged in', () => {
    (Object.getOwnPropertyDescriptor(authService, 'isLoggedIn')!.get as jasmine.Spy).and.returnValue(true);
    expect(guard.canActivate()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should return false and navigate to /login when not authenticated', () => {
    (Object.getOwnPropertyDescriptor(authService, 'isLoggedIn')!.get as jasmine.Spy).and.returnValue(false);
    expect(guard.canActivate()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
