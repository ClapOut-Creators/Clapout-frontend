import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BrandsRepository } from '../../../brands/data-access/brands-repository';
import { Brand } from '../../../brands/models/brand';
import { CampaignsAdminRepository } from '../../../campaigns/data-access/campaigns-admin-repository';
import { PublicCampaign } from '../../../campaigns/models/campaign';
import { PartnershipsRepository } from '../../data-access/partnerships-repository';
import { PartnershipInquiry, PartnershipListResult } from '../../models/partnership';
import { PartnershipDetail } from './partnership-detail';

const brand: Brand = {
  id: 'brand-ewale',
  slug: 'e-wale',
  name: 'E-wale Labs',
  logoUrl: null,
  logoBg: '#1261f3',
  logoFit: 'contain',
  website: 'https://ewale.app',
  industry: 'Fintech',
  country: 'Ghana',
  city: 'Accra',
  contactName: 'Esi Owusu',
  contactEmail: 'esi@ewale.app',
  contactPhone: '+233 24 400 1100',
  status: 'ACTIVE',
  campaignCount: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const campaign: PublicCampaign = {
  slug: 'ewale-launch',
  title: 'E-wale youth wallet launch',
  demo: false,
  brandId: brand.id,
  brand: { logoBg: brand.logoBg, logoFit: brand.logoFit, logoUrl: null, name: brand.name },
  status: 'DRAFT',
  registrationOpen: false,
  platforms: ['tiktok'],
  currency: '₵',
  cpm: null,
  budgetSpent: null,
  budgetTotal: null,
  description: 'Launch support',
  category: 'App',
  startDate: '2026-09-02T00:00:00.000Z',
  endDate: null,
  avgReviewTime: '1d',
  tags: ['App'],
  bannerUrl: null,
  requirementsNote: null,
  requirementsDocUrl: null,
  resourceLabel: null,
  resourceUrl: null,
  updatedAt: '2026-09-01T00:00:00.000Z',
};

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
  activity: [
    {
      id: 'act-1',
      type: 'NOTE',
      message: 'Submitted',
      createdAt: '2026-09-01T09:20:00.000Z',
      createdBy: 'System',
    },
  ],
};

const listResult: PartnershipListResult = {
  inquiries: [inquiry],
  owners: [{ id: 'owner-1', name: 'Ama Mensah' }],
  summary: {
    awaitingFollowUp: 0,
    convertedPartnerships: 0,
    newInquiries: 1,
    overdueFollowUps: 0,
    qualifiedOpportunities: 0,
  },
};

function repositoryDouble(overrides: Partial<PartnershipsRepository> = {}) {
  return {
    get: vi.fn().mockResolvedValue({ ...inquiry }),
    list: vi.fn().mockResolvedValue(listResult),
    update: vi
      .fn()
      .mockImplementation((_id: string, update: Partial<PartnershipInquiry>) =>
        Promise.resolve({ ...inquiry, ...update, activity: inquiry.activity }),
      ),
    convert: vi.fn().mockResolvedValue({
      brand,
      campaignSlug: campaign.slug,
      inquiry: {
        ...inquiry,
        status: 'CONVERTED',
        convertedBrandId: brand.id,
        convertedCampaignId: campaign.slug,
      },
    }),
    ...overrides,
  };
}

function brandsDouble(overrides: Partial<BrandsRepository> = {}) {
  return {
    brand: vi.fn().mockResolvedValue(brand),
    brands: vi.fn().mockResolvedValue([brand]),
    createBrand: vi.fn().mockResolvedValue(brand),
    ...overrides,
  };
}

function campaignsDouble(overrides: Partial<CampaignsAdminRepository> = {}) {
  return {
    createCampaign: vi.fn().mockResolvedValue(campaign),
    ...overrides,
  };
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('PartnershipDetail', () => {
  async function render(
    repository = repositoryDouble(),
    brands = brandsDouble(),
    campaigns = campaignsDouble(),
  ) {
    await TestBed.configureTestingModule({
      imports: [PartnershipDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ inquiryId: 'inq-1' }) } },
        },
        { provide: PartnershipsRepository, useValue: repository },
        { provide: BrandsRepository, useValue: brands },
        { provide: CampaignsAdminRepository, useValue: campaigns },
      ],
    }).compileComponents();

    vi.stubGlobal('open', vi.fn());
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

    const fixture = TestBed.createComponent(PartnershipDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    await nextTask();
    fixture.detectChanges();
    return {
      brands,
      campaigns,
      element: fixture.nativeElement as HTMLElement,
      fixture,
      repository,
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('renders inquiry details, management controls and activity', async () => {
    const { element } = await render();

    expect(element.textContent).toContain('E-wale Labs');
    expect(element.textContent).toContain('Admin management');
    expect(element.textContent).toContain('Activity history');
    expect(element.textContent).toContain('Submitted');
  });

  it('copies contact fields and opens the submitted link', async () => {
    const { element } = await render();

    element.querySelector<HTMLButtonElement>('button[aria-label="Copy email"]')?.click();
    await nextTask();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('esi@ewale.app');

    element.querySelector<HTMLButtonElement>('[data-testid="open-submitted-link"]')?.click();
    expect(window.open).toHaveBeenCalledWith('https://ewale.app', '_blank', 'noopener,noreferrer');
  });

  it('updates status and logs contact attempts', async () => {
    const { element, repository } = await render();

    element.querySelector<HTMLButtonElement>('[data-testid="mark-reviewing"]')?.click();
    await nextTask();

    expect(repository.update).toHaveBeenCalledWith(
      'inq-1',
      expect.objectContaining({ activityType: 'STATUS', status: 'REVIEWING' }),
    );
  });

  it('converts an opportunity through the repository', async () => {
    const { fixture, repository } = await render();
    const component = fixture.componentInstance as unknown as {
      convert: () => Promise<void>;
      nextConversionStep: () => void;
      openConversion: () => Promise<void>;
    };

    await component.openConversion();
    component.nextConversionStep();
    component.nextConversionStep();
    component.nextConversionStep();
    await component.convert();

    expect(repository.convert).toHaveBeenCalledWith(
      'inq-1',
      expect.objectContaining({ createCampaignDraft: true, mode: 'new' }),
    );
  });
});
