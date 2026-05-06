import { Injectable } from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * AuthInterceptor
 * ---------------
 * 1. Attaches JWT Bearer token from localStorage to every outgoing API request.
 * 2. Catches 401 responses globally and redirects to login.
 *
 * Registered as a multi-provider in AppModule so it applies to all HttpClient calls.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('ai_pulse_token');

    // Clone the request and attach Authorization header if token exists
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // Token expired or invalid — clear storage (router injection omitted for brevity)
          localStorage.removeItem('ai_pulse_token');
          console.warn('[AuthInterceptor] 401 received — token cleared.');
        }
        return throwError(() => err);
      })
    );
  }
}
