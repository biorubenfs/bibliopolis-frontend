import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap, throwError, Observable, of, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LoginCredentials,
  UserResponse,
  User,
  AuthResponse,
  DecodedToken,
} from '../models/user.model';
import { ApiError } from '../models/error.model';

const TOKEN_STORAGE_KEY = 'bibliopolis.accessToken';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Signals for auth state
  isAuthenticated = signal<boolean>(false);
  currentUser = signal<User | null>(null);
  accessToken = signal<string | null>(this.loadStoredToken());
  private authCheckComplete = signal<boolean>(false);

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          this.setToken(response.results.attributes.accessToken);
          this.isAuthenticated.set(true);
          this.authCheckComplete.set(true);
          // Fetch user data after successful login
          this.fetchUserData().subscribe();
        }),
        catchError(this.handleError),
      );
  }

  // The backend is stateless (single JWT), so logging out only discards the local token
  logout(): void {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  clearAuth(): void {
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.setToken(null);
    // Mark as complete so guards don't check again
    this.authCheckComplete.set(true);
  }

  // Method for guards to check auth status
  checkAuth(): Observable<boolean> {
    // If auth check is already complete, return current status
    if (this.authCheckComplete()) {
      return of(this.isAuthenticated());
    }

    const token = this.accessToken();

    if (!token || this.isTokenExpired(token)) {
      this.clearAuth();
      return of(false);
    }

    // Validate the stored token against the backend and load the user
    return this.fetchUserData().pipe(
      map(() => {
        this.authCheckComplete.set(true);
        return true;
      }),
      catchError(() => {
        this.clearAuth();
        return of(false);
      }),
    );
  }

  // Simpler check for login guard - only checks current state
  isCurrentlyAuthenticated(): boolean {
    return this.isAuthenticated();
  }

  // Method to force refresh user data (e.g., after profile update)
  refreshUser(): Observable<User> {
    return this.fetchUserData().pipe(catchError(this.handleError));
  }

  private fetchUserData(): Observable<User> {
    return this.http.get<UserResponse>(`${environment.apiUrl}/auth/me`).pipe(
      map((response) => {
        this.currentUser.set(response.results.attributes);
        this.isAuthenticated.set(true);
        return response.results.attributes;
      }),
    );
  }

  private setToken(token: string | null): void {
    this.accessToken.set(token);
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable (e.g. private mode): keep the token in memory only
    }
  }

  private loadStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const { exp } = JSON.parse(json) as DecodedToken;
      return typeof exp === 'number' && exp * 1000 <= Date.now();
    } catch {
      // Malformed token: treat it as expired
      return true;
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error inesperado';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else if (error.error && (error.error as ApiError).message) {
      // API error
      errorMessage = (error.error as ApiError).message;
    }

    return throwError(() => new Error(errorMessage));
  }
}
