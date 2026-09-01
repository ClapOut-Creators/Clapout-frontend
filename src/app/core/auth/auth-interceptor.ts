import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { APP_ENVIRONMENT } from '../config/app-environment';
import { TokenStore } from './token-store';

/**
 * Attaches the bearer token to ClapOut API calls only (never to third-party
 * asset hosts), and drops the session as soon as the API rejects it.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const tokens = inject(TokenStore);
  const apiBaseUrl = inject(APP_ENVIRONMENT).apiBaseUrl;

  const isApiRequest = request.url.startsWith(apiBaseUrl);
  const token = tokens.token();
  const outbound =
    isApiRequest && token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(outbound).pipe(
    catchError((error: unknown) => {
      if (isApiRequest && token && error instanceof HttpErrorResponse && error.status === 401) {
        tokens.clear();
      }
      return throwError(() => error);
    }),
  );
};
