import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { Me } from '../../core/models/user';
import { SignIn } from './sign-in';

@Component({ template: '' })
class EmptyRoute {}

const creator: Me = {
  id: 'creator-1',
  email: 'cara@clapout.test',
  fullName: 'Cara Creator',
  role: 'CREATOR',
  phone: null,
  whatsapp: null,
  socials: [],
  payout: null,
  communityJoinedAt: '2026-09-12T09:00:00.000Z',
  emailVerifiedAt: '2026-09-12T08:00:00.000Z',
  createdAt: '2026-09-12T07:00:00.000Z',
};

/** Signs in as `next` and derives the same flags AuthService would. */
function authDouble(next: Me) {
  const user = signal<Me | null>(null);
  return {
    user: user.asReadonly(),
    isSignedIn: computed(() => user() !== null),
    isAdmin: computed(() => user()?.role === 'ADMIN'),
    needsOnboarding: computed(() => {
      const current = user();
      return (
        current !== null &&
        current.role === 'CREATOR' &&
        (current.emailVerifiedAt === null || current.communityJoinedAt === null)
      );
    }),
    whenSessionReady: async () => {},
    async signIn(): Promise<Me> {
      user.set(next);
      return next;
    },
  };
}

describe('SignIn', () => {
  async function submitAs(next: Me, returnUrl?: string) {
    await TestBed.configureTestingModule({
      imports: [SignIn],
      providers: [
        { provide: AuthService, useValue: authDouble(next) },
        provideRouter([
          { path: 'creator/onboarding', component: EmptyRoute },
          { path: 'creator/dashboard', component: EmptyRoute },
          { path: 'admin/dashboard', component: EmptyRoute },
          { path: 'campaigns/:slug', component: EmptyRoute },
        ]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignIn);
    if (returnUrl !== undefined) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
    }
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const email = element.querySelector('input[type="email"]') as HTMLInputElement;
    // p-password wraps the real input, so it is found by type rather than by control name.
    const password = element.querySelector('input[type="password"]') as HTMLInputElement;
    email.value = 'cara@clapout.test';
    email.dispatchEvent(new Event('input'));
    password.value = 'a-password';
    password.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return TestBed.inject(Router).url;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('sends a finished clipper to their dashboard', async () => {
    expect(await submitAs(creator)).toBe('/creator/dashboard');
  });

  it('honours returnUrl for a finished clipper', async () => {
    expect(await submitAs(creator, '/campaigns/tekme')).toBe('/campaigns/tekme');
  });

  it('sends a clipper with an unverified email to onboarding, keeping returnUrl', async () => {
    const url = await submitAs({ ...creator, emailVerifiedAt: null }, '/campaigns/tekme');
    expect(url).toBe('/creator/onboarding?returnUrl=%2Fcampaigns%2Ftekme');
  });

  it('sends a clipper who has not confirmed the community to onboarding', async () => {
    expect(await submitAs({ ...creator, communityJoinedAt: null })).toBe('/creator/onboarding');
  });

  it('sends an admin to the admin dashboard', async () => {
    const admin: Me = { ...creator, id: 'admin-1', role: 'ADMIN' };
    expect(await submitAs(admin)).toBe('/admin/dashboard');
  });
});
