import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { provideAppConfiguration } from '../../core/config/app-environment';
import { AuthService } from '../../core/auth/auth-service';
import { CampaignsRepository } from '../../core/data/campaigns-repository';
import { RegistrationsRepository } from '../../core/data/registrations-repository';
import { PublicCampaign } from '../../core/models/campaign';
import { CampaignLeaderboard } from '../../core/models/leaderboard';
import { Registration } from '../../core/models/registration';
import { Me } from '../../core/models/user';
import { CampaignDetail } from './campaign-detail';

const campaign: PublicCampaign = {
  slug: 'e-wale-clipping',
  title: 'E-WALE Clipping',
  demo: false,
  brandId: 'brand-1',
  brand: { name: 'E-wale tech', logoUrl: null, logoBg: '#015AF4', logoFit: 'cover' },
  status: 'ACTIVE',
  registrationOpen: true,
  platforms: ['tiktok'],
  currency: '₵',
  cpm: 10,
  budgetSpent: 0,
  budgetTotal: 2000,
  description: 'Dial *714*22#.',
  category: 'Product',
  startDate: '2026-09-02T00:00:00.000Z',
  endDate: '2026-09-30T00:00:00.000Z',
  avgReviewTime: '1d',
  tags: ['Clipping'],
  bannerUrl: null,
  requirementsNote: null,
  requirementsDocUrl: null,
  resourceLabel: null,
  resourceUrl: null,
  updatedAt: '2026-09-02T00:00:00.000Z',
};

const acceptedRegistration = {
  id: 'reg-1',
  status: 'ACCEPTED',
  platform: 'tiktok',
  accountUrl: 'https://tiktok.com/@demo',
  note: null,
  createdAt: '2026-09-02T00:00:00.000Z',
  campaign: { slug: campaign.slug, title: campaign.title },
} satisfies Registration;

const leaderboard: CampaignLeaderboard = {
  entries: [
    {
      rank: 1,
      creatorId: 'creator-1',
      displayName: 'Willian O.',
      verifiedViews: 8400,
      clips: 5,
      isMe: false,
    },
  ],
  totalRanked: 1,
  me: null,
  updatedAt: '2026-09-03T09:00:00.000Z',
};

const creator: Me = {
  id: 'creator-1',
  email: 'cara@clapout.test',
  fullName: 'Cara Creator',
  role: 'CREATOR',
  phone: null,
  whatsapp: null,
  socials: [],
  payout: null,
  createdAt: '2026-08-01T00:00:00.000Z',
};

function authDouble(user: Me | null) {
  const currentUser = signal<Me | null>(user);
  return {
    user: currentUser.asReadonly(),
    isSignedIn: computed(() => currentUser() !== null),
    isAdmin: computed(() => currentUser()?.role === 'ADMIN'),
    whenSessionReady: () => Promise.resolve(),
  };
}

describe('CampaignDetail — studio tabs', () => {
  let leaderboardCalls: number;

  async function render(url: string, user: Me | null = creator) {
    leaderboardCalls = 0;
    await TestBed.configureTestingModule({
      providers: [
        // The mounted submit overlay pulls in the HTTP client and the app config.
        ConfirmationService,
        MessageService,
        provideAppConfiguration(),
        provideHttpClient(),
        provideRouter(
          [{ path: 'campaigns/:slug', component: CampaignDetail }],
          withComponentInputBinding(),
        ),
        { provide: AuthService, useValue: authDouble(user) },
        {
          provide: CampaignsRepository,
          useValue: {
            bySlug: () => Promise.resolve(campaign),
            leaderboard: () => {
              leaderboardCalls += 1;
              return Promise.resolve(leaderboard);
            },
          },
        },
        {
          provide: RegistrationsRepository,
          useValue: { listMine: () => Promise.resolve([acceptedRegistration]) },
        },
      ],
    }).compileComponents();

    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { harness, element: harness.routeNativeElement as HTMLElement };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders the detail tab and no leaderboard request by default', async () => {
    const { element } = await render('/campaigns/e-wale-clipping');

    const tabs = element.querySelectorAll('[role="tab"]');
    expect(Array.from(tabs).map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
    ]);
    expect(element.querySelector('app-leaderboard-list')).toBeNull();
    expect(leaderboardCalls).toBe(0);
  });

  it('shows the leaderboard when the URL asks for it, fetching it once', async () => {
    const { element } = await render('/campaigns/e-wale-clipping?tab=leaderboard');

    expect(element.querySelector('app-leaderboard-list')?.textContent).toContain('Willian O.');
    expect(leaderboardCalls).toBe(1);
  });

  it('treats an unknown tab value as the detail tab', async () => {
    const { element } = await render('/campaigns/e-wale-clipping?tab=nonsense');

    expect(element.querySelector('app-leaderboard-list')).toBeNull();
  });

  it('puts the tab in the URL when one is picked, without a history entry', async () => {
    const { harness, element } = await render('/campaigns/e-wale-clipping');
    const router = TestBed.inject(Router);

    element.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(router.url).toContain('tab=leaderboard');
    expect(element.querySelector('app-leaderboard-list')).not.toBeNull();
  });

  it('offers the accepted clipper the submit CTA, which opens the overlay from the URL', async () => {
    const { harness, element } = await render('/campaigns/e-wale-clipping');
    const router = TestBed.inject(Router);
    const detail = harness.routeDebugElement?.componentInstance as CampaignDetail;

    expect(detail.submitOpen()).toBe(false);

    const cta = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Submit post link',
    );
    cta?.click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(router.url).toContain('submit=1');
    expect(detail.submitOpen()).toBe(true);

    detail.closeSubmit();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(router.url).not.toContain('submit=1');
    expect(detail.submitOpen()).toBe(false);
  });

  it('keeps the public layout — no tabs, no header row — for an anonymous visitor', async () => {
    const { element } = await render('/campaigns/e-wale-clipping?tab=leaderboard', null);

    expect(element.querySelectorAll('[role="tab"]')).toHaveLength(0);
    expect(element.querySelector('app-creator-page-header')).toBeNull();
    expect(element.querySelector('app-leaderboard-list')).toBeNull();
    expect(leaderboardCalls).toBe(0);
  });

  it('keeps the public layout for an admin', async () => {
    const { element } = await render('/campaigns/e-wale-clipping', {
      ...creator,
      role: 'ADMIN',
    });

    expect(element.querySelectorAll('[role="tab"]')).toHaveLength(0);
  });
});

/**
 * Only `setInterval` / `clearInterval` are faked: `whenStable` and the
 * component's own promises still run on real timers, so the harness behaves
 * exactly as it does everywhere else in this file.
 */
describe('CampaignDetail — leaderboard polling', () => {
  let leaderboardCalls: number;

  beforeEach(() => {
    leaderboardCalls = 0;
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    return TestBed.resetTestingModule();
  });

  async function render(url: string, user: Me | null = creator) {
    await TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        MessageService,
        provideAppConfiguration(),
        provideHttpClient(),
        provideRouter(
          [{ path: 'campaigns/:slug', component: CampaignDetail }],
          withComponentInputBinding(),
        ),
        { provide: AuthService, useValue: authDouble(user) },
        {
          provide: CampaignsRepository,
          useValue: {
            bySlug: () => Promise.resolve(campaign),
            leaderboard: () => {
              leaderboardCalls += 1;
              return Promise.resolve(leaderboard);
            },
          },
        },
        {
          provide: RegistrationsRepository,
          useValue: { listMine: () => Promise.resolve([acceptedRegistration]) },
        },
      ],
    }).compileComponents();

    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { harness, element: harness.routeNativeElement as HTMLElement };
  }

  async function settle(harness: RouterTestingHarness): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('re-reads the open board every 30 s, without flashing the skeleton', async () => {
    const { harness, element } = await render('/campaigns/e-wale-clipping?tab=leaderboard');
    expect(leaderboardCalls).toBe(1);

    vi.advanceTimersByTime(30_000);
    await settle(harness);

    expect(leaderboardCalls).toBe(2);
    // The board stayed on screen throughout: no skeleton, no lost entries.
    expect(element.querySelector('app-leaderboard-list')?.textContent).toContain('Willian O.');
    expect(element.querySelector('p-skeleton')).toBeNull();
  });

  it('does not poll while the detail tab is showing', async () => {
    const { harness } = await render('/campaigns/e-wale-clipping');
    expect(leaderboardCalls).toBe(0);

    vi.advanceTimersByTime(90_000);
    await settle(harness);

    expect(leaderboardCalls).toBe(0);
  });

  it('stops polling once the board is left behind', async () => {
    const { harness, element } = await render('/campaigns/e-wale-clipping?tab=leaderboard');
    expect(leaderboardCalls).toBe(1);

    element.querySelectorAll<HTMLButtonElement>('[role="tab"]')[0].click();
    await settle(harness);

    vi.advanceTimersByTime(90_000);
    await settle(harness);

    expect(leaderboardCalls).toBe(1);
  });

  it('re-reads the board as soon as a hidden tab comes back', async () => {
    const { harness } = await render('/campaigns/e-wale-clipping?tab=leaderboard');
    expect(leaderboardCalls).toBe(1);

    document.dispatchEvent(new Event('visibilitychange'));
    await settle(harness);

    expect(leaderboardCalls).toBe(2);
  });

  it('never polls the public page, which has no board at all', async () => {
    const { harness } = await render('/campaigns/e-wale-clipping?tab=leaderboard', null);

    vi.advanceTimersByTime(90_000);
    await settle(harness);

    expect(leaderboardCalls).toBe(0);
  });
});
