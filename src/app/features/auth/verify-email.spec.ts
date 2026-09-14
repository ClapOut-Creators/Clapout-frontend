import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { Me } from '../../core/models/user';
import { VERIFIED_REDIRECT_SECONDS, VerifyEmail } from './verify-email';

const verified: Me = {
  id: 'creator-1',
  email: 'cara@clapout.test',
  fullName: 'Cara Creator',
  role: 'CREATOR',
  phone: null,
  whatsapp: null,
  socials: [],
  payout: null,
  communityJoinedAt: null,
  emailVerifiedAt: '2026-09-12T08:00:00.000Z',
  createdAt: '2026-09-12T07:00:00.000Z',
};

@Component({ template: '' })
class EmptyRoute {}

/** Just enough of AuthService for the page: session flags and the two calls it makes. */
function authDouble(options: {
  signedIn: boolean;
  emailVerified: boolean;
  outcome: 'ok' | 'invalid' | 'down';
}) {
  return {
    isSignedIn: signal(options.signedIn).asReadonly(),
    emailVerified: signal(options.emailVerified).asReadonly(),
    whenSessionReady: async () => {},
    tokensSeen: [] as string[],
    resends: 0,
    async verifyEmail(token: string): Promise<Me> {
      this.tokensSeen.push(token);
      if (options.outcome === 'invalid') {
        throw new ApiError(
          400,
          'INVALID_VERIFICATION_TOKEN',
          'This verification link is invalid or has expired.',
        );
      }
      if (options.outcome === 'down') {
        throw new ApiError(0, 'NETWORK_ERROR', 'offline');
      }
      return verified;
    },
    async resendVerification() {
      this.resends++;
      return { ok: true as const, alreadyVerified: false, sent: true };
    },
  };
}

describe('VerifyEmail', () => {
  let auth: ReturnType<typeof authDouble>;

  async function render(token: string | undefined, options: Parameters<typeof authDouble>[0]) {
    auth = authDouble(options);
    await TestBed.configureTestingModule({
      imports: [VerifyEmail],
      providers: [
        { provide: AuthService, useValue: auth },
        provideRouter([
          { path: 'creator/onboarding', component: EmptyRoute },
          { path: 'auth/sign-in', component: EmptyRoute },
          { path: 'creator/dashboard', component: EmptyRoute },
        ]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VerifyEmail);
    if (token !== undefined) {
      fixture.componentRef.setInput('token', token);
    }
    fixture.detectChanges();
    await flush(fixture);
    return fixture;
  }

  /** The redeem chains a few awaits; a macrotask tick lets them all settle before asserting. */
  async function flush(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  const text = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.textContent ?? '';

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('verifies as soon as the link opens and counts a signed-in creator down into onboarding', async () => {
    // Only the countdown interval is faked; the redeem still settles on real
    // macrotasks through flush().
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const fixture = await render('raw-token', {
      signedIn: true,
      emailVerified: true,
      outcome: 'ok',
    });

    expect(auth.tokensSeen).toEqual(['raw-token']);
    expect(text(fixture)).toContain('Email verified');
    expect(text(fixture)).toContain('cara@clapout.test');
    expect(text(fixture)).toContain(`next step in ${VERIFIED_REDIRECT_SECONDS}s`);
    expect(text(fixture)).toContain('Continue now');

    vi.advanceTimersByTime(VERIFIED_REDIRECT_SECONDS * 1000);
    await flush(fixture);

    expect(TestBed.inject(Router).url).toBe('/creator/onboarding');
  });

  it('lets a signed-in creator skip the countdown', async () => {
    const fixture = await render('raw-token', {
      signedIn: true,
      emailVerified: true,
      outcome: 'ok',
    });

    const element = fixture.nativeElement as HTMLElement;
    const button = Array.from(element.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('Continue now'),
    );
    button?.click();
    await flush(fixture);

    expect(TestBed.inject(Router).url).toBe('/creator/onboarding');
  });

  it('points a signed-out visitor at sign-in after verifying', async () => {
    const fixture = await render('raw-token', {
      signedIn: false,
      emailVerified: false,
      outcome: 'ok',
    });

    expect(text(fixture)).toContain('Email verified');
    expect(text(fixture)).toContain('Taking you to sign in');
    expect(text(fixture)).toContain('Go to sign in');
  });

  it('explains a dead link and offers a resend to the unverified signed-in account', async () => {
    const fixture = await render('stale', {
      signedIn: true,
      emailVerified: false,
      outcome: 'invalid',
    });

    expect(text(fixture)).toContain('This verification link is invalid');
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Send a new link');

    button.click();
    await flush(fixture);

    expect(auth.resends).toBe(1);
    expect(text(fixture)).toContain('A new link is on its way');
    expect(text(fixture)).toContain('Resend in 60s');
  });

  it('sends a signed-out visitor with a dead link to sign in, not to a resend', async () => {
    const fixture = await render('stale', {
      signedIn: false,
      emailVerified: false,
      outcome: 'invalid',
    });

    expect(text(fixture)).toContain('This verification link is invalid');
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Go to sign in');
    expect(auth.resends).toBe(0);
  });

  it('asks for the full link when the token is missing, without calling the API', async () => {
    const fixture = await render(undefined, {
      signedIn: false,
      emailVerified: false,
      outcome: 'ok',
    });

    expect(auth.tokensSeen).toEqual([]);
    expect(text(fixture)).toContain('This link is incomplete');
  });

  it('shows a retry message when the API cannot be reached', async () => {
    const fixture = await render('raw-token', {
      signedIn: true,
      emailVerified: false,
      outcome: 'down',
    });

    expect(text(fixture)).toContain('We could not verify your email');
    expect(text(fixture)).toContain('Check your connection');
  });
});
