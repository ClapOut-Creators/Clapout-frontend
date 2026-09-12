import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Me } from '../models/user';
import { AuthService } from './auth-service';
import { onboardingGuard } from './onboarding-guard';

const creator: Me = {
  id: 'creator-1',
  email: 'cara@clapout.test',
  fullName: 'Cara Creator',
  role: 'CREATOR',
  phone: null,
  whatsapp: null,
  socials: [],
  payout: null,
  communityJoinedAt: null,
  emailVerifiedAt: '2026-08-01T00:00:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z',
};

function authDouble(user: Me | null) {
  const currentUser = signal<Me | null>(user);
  const isSignedIn = computed(() => currentUser() !== null);
  return {
    user: currentUser.asReadonly(),
    isSignedIn,
    isAdmin: computed(() => currentUser()?.role === 'ADMIN'),
    needsOnboarding: computed(
      () =>
        isSignedIn() &&
        currentUser()?.role === 'CREATOR' &&
        (!currentUser()?.emailVerifiedAt || !currentUser()?.communityJoinedAt),
    ),
    whenSessionReady: () => Promise.resolve(),
  };
}

async function run(user: Me | null, url = '/creator/campaigns/e-wale/apply') {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: authDouble(user) }],
  });
  const state = { url } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => onboardingGuard({} as ActivatedRouteSnapshot, state));
}

describe('onboardingGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('sends a creator who has not joined the community to onboarding, keeping the URL', async () => {
    const result = await run(creator);

    expect(result).toBeInstanceOf(UrlTree);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/creator/onboarding?returnUrl=%2Fcreator%2Fcampaigns%2Fe-wale%2Fapply',
    );
  });

  it('lets an onboarded creator through', async () => {
    const result = await run({ ...creator, communityJoinedAt: '2026-09-01T00:00:00.000Z' });

    expect(result).toBe(true);
  });

  it('never gates an admin', async () => {
    const result = await run({ ...creator, role: 'ADMIN' });

    expect(result).toBe(true);
  });
});
