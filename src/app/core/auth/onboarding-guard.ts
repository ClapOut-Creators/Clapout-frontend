import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';

/** Where a creator finishes setting up: socials, then the WhatsApp community. */
export const ONBOARDING_PATH = '/creator/onboarding';

/**
 * Runs after {@link creatorGuard} on the routes a creator must be onboarded to
 * use (applying to a campaign, their submissions). A creator who has not yet
 * confirmed the WhatsApp community is sent to the onboarding page with the
 * requested URL as `returnUrl`, so they land back here once they finish.
 *
 * The dashboard is deliberately not guarded: it shows the same steps in a
 * sheet that cannot be dismissed, which is how existing sign-ups are caught.
 */
export const onboardingGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenSessionReady();

  if (!auth.needsOnboarding()) {
    return true;
  }

  return router.createUrlTree([ONBOARDING_PATH], {
    queryParams: { returnUrl: state.url },
  });
};
