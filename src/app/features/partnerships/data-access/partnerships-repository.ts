import { inject, Injectable } from '@angular/core';
import { BrandsRepository } from '../../brands/data-access/brands-repository';
import { CampaignsAdminRepository } from '../../campaigns/data-access/campaigns-admin-repository';
import {
  ConvertPartnershipCommand,
  ConvertPartnershipResult,
  PARTNERSHIP_STATUS_LABELS,
  PartnershipInquiry,
  PartnershipListResult,
  PartnershipOwner,
  PartnershipQuery,
  PartnershipSummary,
  PartnershipUpdate,
} from '../models/partnership';

const OWNERS: PartnershipOwner[] = [
  { id: 'owner-ama', name: 'Ama Mensah' },
  { id: 'owner-kofi', name: 'Kofi Boateng' },
  { id: 'owner-ada', name: 'Ada Admin' },
];

const TODAY = Date.parse('2026-09-02T12:00:00.000Z');

const MOCK_INQUIRIES: PartnershipInquiry[] = [
  {
    id: 'inq-ewale',
    contactName: 'Esi Owusu',
    email: 'esi@ewale.app',
    phone: '+233 24 400 1100',
    company: 'E-wale Labs',
    promoting: 'E-wale youth wallet launch',
    websiteUrl: 'https://ewale.app',
    contentType: 'App',
    platforms: ['tiktok', 'instagram'],
    budgetRange: 'GHS 15k-50k',
    timeline: 'Next 30 days',
    message:
      'We are launching a student wallet and want creators to explain rewards, deposits and merchant payments.',
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
        id: 'act-ewale-1',
        type: 'NOTE',
        message: 'Inquiry submitted from the website partnership form.',
        createdAt: '2026-09-01T09:20:00.000Z',
        createdBy: 'System',
      },
    ],
  },
  {
    id: 'inq-nova',
    contactName: 'Kojo Antwi',
    email: 'partnerships@novadrinks.co',
    phone: '+233 50 998 1000',
    company: 'Nova Drinks',
    promoting: 'New malt beverage campus sampling',
    websiteUrl: 'https://novadrinks.co',
    contentType: 'Product',
    platforms: ['instagram', 'youtube'],
    budgetRange: 'GHS 50k+',
    timeline: 'This quarter',
    message: 'We need creator videos before retail launch and may need a proposal by Friday.',
    source: 'Website partnership form',
    status: 'AWAITING_FOLLOW_UP',
    assignedToId: 'owner-ama',
    assignedToName: 'Ama Mensah',
    followUpAt: '2026-09-01T16:00:00.000Z',
    qualification: 'QUALIFYING',
    priority: 'HIGH',
    internalNotes: 'Likely good fit. Confirm decision maker and sampling regions.',
    submittedAt: '2026-08-29T14:45:00.000Z',
    convertedBrandId: null,
    convertedCampaignId: null,
    closedReason: null,
    activity: [
      {
        id: 'act-nova-1',
        type: 'CONTACT',
        message: 'WhatsApp intro sent. Waiting on budget confirmation.',
        createdAt: '2026-08-30T10:10:00.000Z',
        createdBy: 'Ama Mensah',
      },
    ],
  },
  {
    id: 'inq-sankofa',
    contactName: 'Nana Yeboah',
    email: 'nana@sankofasounds.com',
    phone: null,
    company: 'Sankofa Sounds',
    promoting: 'Afrobeats EP release',
    websiteUrl: 'https://instagram.com/sankofasounds',
    contentType: 'Artist',
    platforms: ['tiktok', 'instagram', 'x'],
    budgetRange: 'GHS 5k-15k',
    timeline: 'This month',
    message: 'Looking for short-form creators to clip the lead single and announce the EP.',
    source: 'Website partnership form',
    status: 'QUALIFIED',
    assignedToId: 'owner-kofi',
    assignedToName: 'Kofi Boateng',
    followUpAt: '2026-09-05T10:00:00.000Z',
    qualification: 'QUALIFIED',
    priority: 'MEDIUM',
    internalNotes: 'Qualified for music creator pilot. Prepare proposal.',
    submittedAt: '2026-08-27T08:15:00.000Z',
    convertedBrandId: null,
    convertedCampaignId: null,
    closedReason: null,
    activity: [
      {
        id: 'act-sankofa-1',
        type: 'STATUS',
        message: 'Marked qualified after budget and timeline review.',
        createdAt: '2026-08-28T12:00:00.000Z',
        createdBy: 'Kofi Boateng',
      },
    ],
  },
  {
    id: 'inq-metro',
    contactName: 'Abena Sarpong',
    email: 'abena@metrostyle.store',
    phone: '+233 20 221 3030',
    company: 'Metro Style',
    promoting: 'Back-to-school fashion drop',
    websiteUrl: 'https://metrostyle.store',
    contentType: 'Campaign',
    platforms: ['instagram'],
    budgetRange: 'GHS 15k-50k',
    timeline: 'Flexible',
    message: 'Interested in a creator campaign if the team can help with launch positioning.',
    source: 'Website partnership form',
    status: 'CONVERTED',
    assignedToId: 'owner-ada',
    assignedToName: 'Ada Admin',
    followUpAt: null,
    qualification: 'QUALIFIED',
    priority: 'MEDIUM',
    internalNotes: 'Converted to brand and draft. Keep original inquiry for audit.',
    submittedAt: '2026-08-20T11:30:00.000Z',
    convertedBrandId: 'brand-metro',
    convertedCampaignId: 'metro-school-drop',
    closedReason: null,
    activity: [
      {
        id: 'act-metro-1',
        type: 'CONVERSION',
        message: 'Converted to a brand record and campaign draft.',
        createdAt: '2026-08-22T15:00:00.000Z',
        createdBy: 'Ada Admin',
      },
    ],
  },
];

function copyInquiry(inquiry: PartnershipInquiry): PartnershipInquiry {
  return {
    ...inquiry,
    activity: inquiry.activity.map((activity) => ({ ...activity })),
  };
}

function isOverdue(inquiry: PartnershipInquiry): boolean {
  return Boolean(inquiry.followUpAt && Date.parse(inquiry.followUpAt) < TODAY);
}

function summaryFor(inquiries: PartnershipInquiry[]): PartnershipSummary {
  return {
    newInquiries: inquiries.filter((inquiry) => inquiry.status === 'NEW').length,
    awaitingFollowUp: inquiries.filter((inquiry) => inquiry.status === 'AWAITING_FOLLOW_UP').length,
    qualifiedOpportunities: inquiries.filter((inquiry) => inquiry.status === 'QUALIFIED').length,
    convertedPartnerships: inquiries.filter((inquiry) => inquiry.status === 'CONVERTED').length,
    overdueFollowUps: inquiries.filter(isOverdue).length,
  };
}

function ownerName(ownerId: string | null | undefined): string | null {
  return OWNERS.find((owner) => owner.id === ownerId)?.name ?? null;
}

@Injectable({ providedIn: 'root' })
export class PartnershipsRepository {
  private readonly brands = inject(BrandsRepository);
  private readonly campaigns = inject(CampaignsAdminRepository);
  private readonly inquiries = MOCK_INQUIRIES.map(copyInquiry);

  async list(query: PartnershipQuery = {}): Promise<PartnershipListResult> {
    const search = query.search?.trim().toLowerCase();
    const rows = this.inquiries
      .filter(
        (inquiry) => !query.status || query.status === 'ALL' || inquiry.status === query.status,
      )
      .filter((inquiry) => {
        if (!query.ownerId || query.ownerId === 'ALL') {
          return true;
        }
        return query.ownerId === 'UNASSIGNED'
          ? inquiry.assignedToId === null
          : inquiry.assignedToId === query.ownerId;
      })
      .filter(
        (inquiry) =>
          !query.budgetRange ||
          query.budgetRange === 'ALL' ||
          inquiry.budgetRange === query.budgetRange,
      )
      .filter(
        (inquiry) =>
          !query.contentType ||
          query.contentType === 'ALL' ||
          inquiry.contentType === query.contentType,
      )
      .filter(
        (inquiry) =>
          !query.timeline || query.timeline === 'ALL' || inquiry.timeline === query.timeline,
      )
      .filter((inquiry) => !query.overdueOnly || isOverdue(inquiry))
      .filter((inquiry) => !query.unassignedOnly || inquiry.assignedToId === null)
      .filter((inquiry) => !query.submittedAfter || inquiry.submittedAt >= query.submittedAfter)
      .filter((inquiry) => !query.submittedBefore || inquiry.submittedAt <= query.submittedBefore)
      .filter((inquiry) =>
        search
          ? [inquiry.contactName, inquiry.company, inquiry.email, inquiry.promoting]
              .join(' ')
              .toLowerCase()
              .includes(search)
          : true,
      )
      .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));

    return {
      inquiries: rows.map(copyInquiry),
      owners: OWNERS.map((owner) => ({ ...owner })),
      summary: summaryFor(this.inquiries),
    };
  }

  async get(id: string): Promise<PartnershipInquiry | null> {
    return this.inquiries.find((inquiry) => inquiry.id === id)
      ? copyInquiry(this.inquiries.find((inquiry) => inquiry.id === id)!)
      : null;
  }

  async update(id: string, update: PartnershipUpdate): Promise<PartnershipInquiry> {
    const inquiry = this.requireInquiry(id);
    inquiry.status = update.status ?? inquiry.status;
    inquiry.assignedToId =
      update.assignedToId === undefined ? inquiry.assignedToId : update.assignedToId;
    inquiry.assignedToName = ownerName(inquiry.assignedToId);
    inquiry.followUpAt = update.followUpAt === undefined ? inquiry.followUpAt : update.followUpAt;
    inquiry.qualification = update.qualification ?? inquiry.qualification;
    inquiry.priority = update.priority ?? inquiry.priority;
    inquiry.internalNotes = update.internalNotes ?? inquiry.internalNotes;
    inquiry.closedReason =
      update.closedReason === undefined ? inquiry.closedReason : update.closedReason;
    inquiry.activity.unshift({
      id: `act-${Date.now()}`,
      type: update.activityType ?? (update.status ? 'STATUS' : 'NOTE'),
      message:
        update.activityMessage ??
        (update.status
          ? `Moved to ${PARTNERSHIP_STATUS_LABELS[update.status]}.`
          : 'Updated inquiry.'),
      createdAt: new Date().toISOString(),
      createdBy: inquiry.assignedToName ?? 'Admin',
    });
    return copyInquiry(inquiry);
  }

  async convert(id: string, command: ConvertPartnershipCommand): Promise<ConvertPartnershipResult> {
    const inquiry = this.requireInquiry(id);
    const brand =
      command.mode === 'existing' && command.existingBrandId
        ? await this.brands.brand(command.existingBrandId)
        : await this.brands.createBrand({
            name: command.brand.name,
            website: command.brand.website,
            industry: command.brand.industry,
            country: command.brand.country,
            city: command.brand.city,
            contactName: command.brand.contactName,
            contactEmail: command.brand.contactEmail,
            contactPhone: command.brand.contactPhone,
            status: 'ACTIVE',
          });

    let campaignSlug: string | null = null;
    if (command.createCampaignDraft) {
      const campaign = await this.campaigns.createCampaign({
        title: command.campaignTitle,
        brandId: brand.id,
        description: inquiry.message,
        category: inquiry.contentType,
        currency: '₵',
        platforms: inquiry.platforms,
        tags: [inquiry.contentType, inquiry.promoting],
        budgetTotal: null,
        cpm: null,
        startDate: null,
        endDate: null,
        resourceLabel: inquiry.websiteUrl ? 'Submitted link' : null,
        resourceUrl: inquiry.websiteUrl,
      });
      campaignSlug = campaign.slug;
    }

    inquiry.status = 'CONVERTED';
    inquiry.qualification = 'QUALIFIED';
    inquiry.convertedBrandId = brand.id;
    inquiry.convertedCampaignId = campaignSlug;
    inquiry.activity.unshift({
      id: `act-${Date.now()}`,
      type: 'CONVERSION',
      message: campaignSlug
        ? 'Converted to a brand record and campaign draft.'
        : 'Converted to a brand record.',
      createdAt: new Date().toISOString(),
      createdBy: ownerName(command.assignedManagerId) ?? inquiry.assignedToName ?? 'Admin',
    });

    return { brand, campaignSlug, inquiry: copyInquiry(inquiry) };
  }

  private requireInquiry(id: string): PartnershipInquiry {
    const inquiry = this.inquiries.find((row) => row.id === id);
    if (!inquiry) {
      throw new Error('Partnership inquiry not found.');
    }
    return inquiry;
  }
}
