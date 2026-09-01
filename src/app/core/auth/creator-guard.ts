import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';

/**
 * Creator-only routes. Anonymous visitors are sent to sign-in with a
 * `returnUrl` so they land back on the page they asked for.
 */
export const creatorGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenSessionReady();

  if (auth.isSignedIn()) {
    return true;
  }

  return router.createUrlTree(['/auth/sign-in'], {
    queryParams: { returnUrl: state.url },
  });
};
