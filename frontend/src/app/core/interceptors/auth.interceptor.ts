import { Injectable } from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

/**
 * AuthInterceptor
 * ---------------
 * 1. Attaches JWT Bearer token from localStorage to every outgoing API request.
 * 2. Catches 401 responses globally and redirects to /login (clears token).
 *
 * Registered as a multi-provider in AppModule so it applies to all HttpClient calls.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('ai_pulse_token');

    // Clone the request and attach Authorization header if token exists
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // Token expired or invalid — clear storage and force login
          localStorage.removeItem('ai_pulse_token');
          localStorage.removeItem('ai_pulse_user');
          console.warn('[AuthInterceptor] 401 received — redirecting to login.');
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      })
    );
  }
}
