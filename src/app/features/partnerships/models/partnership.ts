import { Brand } from '../../brands/models/brand';
import { CampaignPlatform } from '../../campaigns/models/campaign';

export type PartnershipStatus =
  | 'NEW'
  | 'REVIEWING'
  | 'AWAITING_FOLLOW_UP'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATING'
  | 'CONVERTED'
  | 'NOT_A_FIT'
  | 'SPAM'
  | 'DUPLICATE'
  | 'CLOSED';

export type PartnershipPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type PartnershipQualification = 'UNQUALIFIED' | 'QUALIFYING' | 'QUALIFIED' | 'DISQUALIFIED';
export type PartnershipContentType =
  'Product' | 'Service' | 'Artist' | 'Campaign' | 'Event' | 'App';
export type PartnershipBudgetRange = 'Under GHS 5k' | 'GHS 5k-15k' | 'GHS 15k-50k' | 'GHS 50k+';
export type PartnershipTimeline = 'This month' | 'Next 30 days' | 'This quarter' | 'Flexible';
export type PartnershipActivityType =
  'NOTE' | 'STATUS' | 'FOLLOW_UP' | 'CONTACT' | 'PROPOSAL' | 'CONVERSION';

export interface PartnershipOwner {
  id: string;
  name: string;
}

export interface PartnershipActivity {
  id: string;
  type: PartnershipActivityType;
  message: string;
  createdAt: string;
  createdBy: string;
}

export interface PartnershipInquiry {
  id: string;
  contactName: string;
  email: string;
  phone: string | null;
  company: string;
  promoting: string;
  websiteUrl: string | null;
  contentType: PartnershipContentType;
  platforms: CampaignPlatform[];
  budgetRange: PartnershipBudgetRange;
  timeline: PartnershipTimeline;
  message: string;
  source: string;
  status: PartnershipStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  followUpAt: string | null;
  qualification: PartnershipQualification;
  priority: PartnershipPriority;
  internalNotes: string;
  submittedAt: string;
  convertedBrandId: string | null;
  convertedCampaignId: string | null;
  closedReason: string | null;
  activity: PartnershipActivity[];
}

export interface PartnershipQuery {
  status?: PartnershipStatus | 'ALL';
  ownerId?: string | 'ALL' | 'UNASSIGNED';
  budgetRange?: PartnershipBudgetRange | 'ALL';
  contentType?: PartnershipContentType | 'ALL';
  timeline?: PartnershipTimeline | 'ALL';
  submittedAfter?: string;
  submittedBefore?: string;
  overdueOnly?: boolean;
  unassignedOnly?: boolean;
  search?: string;
}

export interface PartnershipSummary {
  newInquiries: number;
  awaitingFollowUp: number;
  qualifiedOpportunities: number;
  convertedPartnerships: number;
  overdueFollowUps: number;
}

export interface PartnershipListResult {
  inquiries: PartnershipInquiry[];
  summary: PartnershipSummary;
  owners: PartnershipOwner[];
}

export interface PartnershipUpdate {
  status?: PartnershipStatus;
  assignedToId?: string | null;
  followUpAt?: string | null;
  qualification?: PartnershipQualification;
  priority?: PartnershipPriority;
  internalNotes?: string;
  closedReason?: string | null;
  activityMessage?: string;
  activityType?: PartnershipActivityType;
}

export interface ConvertPartnershipCommand {
  mode: 'existing' | 'new';
  existingBrandId?: string;
  brand: {
    name: string;
    website: string | null;
    industry: string | null;
    country: string | null;
    city: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  createCampaignDraft: boolean;
  campaignTitle: string;
  assignedManagerId: string | null;
}

export interface ConvertPartnershipResult {
  inquiry: PartnershipInquiry;
  brand: Brand;
  campaignSlug: string | null;
}

export const PARTNERSHIP_STATUS_LABELS: Record<PartnershipStatus, string> = {
  NEW: 'New inquiry',
  REVIEWING: 'Reviewing',
  AWAITING_FOLLOW_UP: 'Awaiting follow-up',
  QUALIFIED: 'Qualified',
  PROPOSAL_SENT: 'Proposal sent',
  NEGOTIATING: 'Negotiating',
  CONVERTED: 'Converted',
  NOT_A_FIT: 'Not a fit',
  SPAM: 'Spam',
  DUPLICATE: 'Duplicate',
  CLOSED: 'Closed',
};
