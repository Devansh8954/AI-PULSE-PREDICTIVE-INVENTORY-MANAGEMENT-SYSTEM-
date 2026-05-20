import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'WAREHOUSE' | 'VIEWER';
}

const TOKEN_KEY = 'ai_pulse_token';
const USER_KEY  = 'ai_pulse_user';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly _user$ = new BehaviorSubject<AuthUser | null>(this.loadUser());
  readonly user$ = this._user$.asObservable();

  private readonly base = environment.apiBaseUrl;

  constructor(private http: HttpClient, private router: Router) {}

  get currentUser(): AuthUser | null { return this._user$.value; }
  get isLoggedIn(): boolean          { return !!localStorage.getItem(TOKEN_KEY); }
  get token(): string | null         { return localStorage.getItem(TOKEN_KEY); }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.base}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        this._user$.next(res.data.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user$.next(null);
    this.router.navigate(['/login']);
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
