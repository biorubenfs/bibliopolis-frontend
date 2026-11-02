import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoginEndpoint = req.url.includes('/auth/login');
  const accessToken = authService.accessToken();

  const authReq =
    accessToken && !isLoginEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // A 401 on an authenticated request means the JWT expired or is invalid.
      // There is no refresh token anymore, so the user has to log in again.
      if (error.status === 401 && !isLoginEndpoint && accessToken) {
        authService.clearAuth();
        router.navigate(['/login'], {
          queryParams: { sessionExpired: 'true' },
        });

        return throwError(
          () => new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'),
        );
      }

      return throwError(() => error);
    }),
  );
};
