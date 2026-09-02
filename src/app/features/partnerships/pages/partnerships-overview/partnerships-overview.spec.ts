import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PartnershipsRepository } from '../../data-access/partnerships-repository';
import {
  PartnershipInquiry,
  PartnershipListResult,
  PartnershipOwner,
  PartnershipSummary,
} from '../../models/partnership';
import { PartnershipsOverview } from './partnerships-overview';

const owners: PartnershipOwner[] = [{ id: 'owner-1', name: 'Ama Mensah' }];

const inquiry: PartnershipInquiry = {
  id: 'inq-1',
  contactName: 'Esi Owusu',
  email: 'esi@ewale.app',
  phone: '+233 24 400 1100',
  company: 'E-wale Labs',
  promoting: 'E-wale youth wallet launch',
  websiteUrl: 'https://ewale.app',
  contentType: 'App',
  platforms: ['tiktok'],
  budgetRange: 'GHS 15k-50k',
  timeline: 'Next 30 days',
  message: 'Launch support',
  source: 'Website partnership form',
  status: 'NEW',
  assignedToId: null,
  assignedToName: null,
  followUpAt: null,
  qualification: 'UNQUALIFIED',
  priority: 'HIGH',
  internalNotes: '',
  submittedAt: '2026-09-01T09:20:00.000Z',
  convertedBrandId: null,
  convertedCampaignId: null,
  closedReason: null,
  activity: [],
};

const summary: PartnershipSummary = {
  awaitingFollowUp: 2,
  convertedPartnerships: 1,
  newInquiries: 3,
  overdueFollowUps: 1,
  qualifiedOpportunities: 4,
};

function result(inquiries: PartnershipInquiry[] = [inquiry]): PartnershipListResult {
  return { inquiries, owners, summary };
}

function repositoryDouble(overrides: Partial<PartnershipsRepository> = {}) {
  return {
    list: vi.fn().mockResolvedValue(result()),
    ...overrides,
  };
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('PartnershipsOverview', () => {
  async function render(repository = repositoryDouble()) {
    await TestBed.configureTestingModule({
      imports: [PartnershipsOverview],
      providers: [
        provideRouter([{ path: 'admin/partnerships/:id', component: PartnershipsOverview }]),
        { provide: PartnershipsRepository, useValue: repository },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PartnershipsOverview);
    fixture.detectChanges();
    await fixture.whenStable();
    await nextTask();
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement, fixture, repository };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders pipeline metrics, filters and inquiry rows', async () => {
    const { element } = await render();

    expect(element.textContent).toContain('Partnership requests');
    expect(element.textContent).toContain('New inquiries');
    expect(element.textContent).toContain('Overdue follow-ups');
    expect(element.textContent).toContain('E-wale Labs');
    expect(element.textContent).toContain('E-wale youth wallet launch');
    expect(element.querySelector('a[href="/admin/partnerships/inq-1"]')).toBeTruthy();
  });

  it('shows filtered empty copy', async () => {
    const { element } = await render(
      repositoryDouble({ list: vi.fn().mockResolvedValue(result([])) }),
    );

    expect(element.textContent).toContain('No partnership inquiries yet');
  });

  it('renders errors with retry', async () => {
    const { element } = await render(
      repositoryDouble({ list: vi.fn().mockRejectedValue(new Error('Could not load')) }),
    );

    expect(element.textContent).toContain('Could not load');
    expect(element.querySelector('[data-testid="partnerships-retry"]')).toBeTruthy();
  });
});
