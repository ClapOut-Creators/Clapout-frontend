import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminRepository } from '../../core/data/admin-repository';
import { AdminStats } from '../../core/models/admin';
import { PublicCampaign } from '../../core/models/campaign';
import { AdminDashboard } from './admin-dashboard';

const stats: AdminStats = {
  publishedCampaigns: 12,
  totalCreators: 72,
  totalBrands: 2,
  newRegistrations7d: 9,
  awaitingReview: 18,
  registrationActivity: [
    { date: '2026-08-11', count: 4 },
    { date: '2026-08-12', count: 5 },
    { date: '2026-08-13', count: 8 },
  ],
};

const activeCampaign: PublicCampaign = {
  slug: 'e-wale',
  title: 'E-wale tech',
  demo: false,
  brandId: 'brand-1',
  brand: {
    name: 'E-wale',
    logoUrl: null,
    logoBg: '#1261f3',
    logoFit: 'contain',
  },
  status: 'ACTIVE',
  registrationOpen: true,
  autoApproveRegistrations: false,
  platforms: ['tiktok'],
  currency: 'GHS ',
  cpm: 20,
  budgetSpent: 120,
  budgetTotal: 2000,
  description: 'Creator campaign',
  category: 'Finance',
  startDate: '2026-08-14T00:00:00.000Z',
  endDate: '2099-08-28T00:00:00.000Z',
  avgReviewTime: '1d',
  tags: [],
  bannerUrl: null,
  requirementsNote: null,
  requirementsDocUrl: null,
  resourceLabel: null,
  resourceUrl: null,
  updatedAt: '2026-08-30T00:00:00.000Z',
};

const pendingBudgetCampaign: PublicCampaign = {
  ...activeCampaign,
  slug: 'pending-budget',
  title: 'Pending budget',
  budgetSpent: null,
  budgetTotal: null,
  updatedAt: '2026-08-29T00:00:00.000Z',
};

function repositoryDouble(overrides: Partial<AdminRepository> = {}) {
  return {
    stats: vi.fn().mockResolvedValue(stats),
    campaigns: vi.fn().mockResolvedValue([activeCampaign, pendingBudgetCampaign]),
    ...overrides,
  };
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('AdminDashboard', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  async function render(admin = repositoryDouble()) {
    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [provideRouter([]), { provide: AdminRepository, useValue: admin }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    await nextTask();
    fixture.detectChanges();
    return { admin, element: fixture.nativeElement as HTMLElement, fixture };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders metrics, activity summary, attention items, and recent campaigns', async () => {
    const { element } = await render();

    // The #F9F9F9 canvas is painted by the app shell (app.html), not by this
    // component, so only the landmark itself is asserted here.
    expect(element.querySelector('main')).toBeTruthy();
    expect(element.textContent).toContain('Published campaigns');
    expect(element.textContent).toContain('Total creators');
    expect(element.textContent).toContain('17 new registrations from 11 Aug to 13 Aug.');
    expect(element.querySelector('[echarts][role="img"]')?.getAttribute('aria-label')).toContain(
      'Bar chart of new registrations',
    );
    expect(element.textContent).toContain('Need Attention');
    expect(element.textContent).toContain('Creator applications');
    expect(element.textContent).toContain('Pending budget');
    expect(element.textContent).toContain('E-wale tech');
    expect(element.textContent).toContain('View details');
  });

  it('renders the loading state while dashboard data is unresolved', async () => {
    let resolveStats: (value: AdminStats) => void = () => undefined;
    const admin = repositoryDouble({
      stats: vi.fn(
        () =>
          new Promise<AdminStats>((resolve) => {
            resolveStats = resolve;
          }),
      ),
    });

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [provideRouter([]), { provide: AdminRepository, useValue: admin }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Loading the admin dashboard',
    );

    resolveStats(stats);
    await fixture.whenStable();
  });

  it('renders an empty campaign state', async () => {
    const { element } = await render(
      repositoryDouble({ campaigns: vi.fn().mockResolvedValue([]) }),
    );

    expect(element.textContent).toContain('No campaigns yet');
    expect(element.textContent).toContain('Create campaign');
  });

  it('renders an error with a retry action', async () => {
    const { element } = await render(
      repositoryDouble({ stats: vi.fn().mockRejectedValue(new Error('boom')) }),
    );

    expect(element.textContent).toContain('We could not load the admin dashboard.');
    expect(element.textContent).toContain('Try again');
  });
});
