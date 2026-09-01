import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';

/**
 * Admin-only routes. Anonymous visitors are sent to sign-in with a `returnUrl`;
 * signed-in non-admins get `/forbidden` rather than a sign-in loop they could
 * never escape.
 */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenSessionReady();

  if (!auth.isSignedIn()) {
    return router.createUrlTree(['/auth/sign-in'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return auth.isAdmin() || router.createUrlTree(['/forbidden']);
};
