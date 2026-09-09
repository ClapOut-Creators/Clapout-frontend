import { CampaignPlatform, CampaignStatus, PublicCampaign } from '../../core/models/campaign';
import { hasBudget } from '../../core/util/campaign-format';

/**
 * Client-side filtering for the admin campaign index.
 *
 * Every dimension lives in the URL (`?status=&show=&brand=&category=&platform=`)
 * so a filtered view is shareable and the dashboard's "Need Attention" links
 * can deep-link straight into it; the search term stays local. The helpers here
 * are pure so the page and its tests share one definition of each filter.
 */

/** 'ALL' is the absent-`?status=` default rather than a backend status. */
export type StatusFilter = CampaignStatus | 'ALL';

/**
 * One-word quick views. `ending-soon` and `pending-budget` mirror the dashboard's
 * Need Attention counts, so the number an admin clicks matches the list they land on.
 */
export type AttentionFilter =
  'ending-soon' | 'pending-budget' | 'registration-open' | 'auto-approve';

export interface CampaignFilters {
  readonly status: StatusFilter;
  readonly attention: AttentionFilter | null;
  /** Brand id, matched against `campaign.brandId`. */
  readonly brand: string | null;
  readonly category: string | null;
  readonly platform: CampaignPlatform | null;
  readonly search: string;
}

export const EMPTY_FILTERS: CampaignFilters = {
  status: 'ALL',
  attention: null,
  brand: null,
  category: null,
  platform: null,
  search: '',
};

/** The dashboard's "Ending soon" window; keep in step with admin-dashboard.ts. */
export const ENDING_SOON_WINDOW_DAYS = 7;

export const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Closed', value: 'CLOSED' },
];

export const ATTENTION_FILTERS: { label: string; value: AttentionFilter; summary: string }[] = [
  {
    label: 'Ending soon',
    value: 'ending-soon',
    summary: `ending in the next ${ENDING_SOON_WINDOW_DAYS} days`,
  },
  { label: 'Pending budget', value: 'pending-budget', summary: 'with no budget announced' },
  { label: 'Registration open', value: 'registration-open', summary: 'open for registration' },
  { label: 'Auto-approve on', value: 'auto-approve', summary: 'auto-approving registrations' },
];

const KNOWN_PLATFORMS: readonly CampaignPlatform[] = [
  'tiktok',
  'x',
  'facebook',
  'instagram',
  'youtube',
  'snapchat',
  'whatsapp',
];

/**
 * Active and finishing within `days` of `now`. Drafts and closed campaigns
 * never count, nor does one whose end date is unannounced or already past.
 */
export function endsWithinDays(
  campaign: Pick<PublicCampaign, 'status' | 'endDate'>,
  days: number,
  now: number = Date.now(),
): boolean {
  if (!campaign.endDate || campaign.status !== 'ACTIVE') {
    return false;
  }
  const end = new Date(campaign.endDate).getTime();
  if (Number.isNaN(end)) {
    return false;
  }
  return end >= now && end <= now + days * 24 * 60 * 60 * 1000;
}

export function matchesAttention(
  campaign: PublicCampaign,
  attention: AttentionFilter | null,
  now: number = Date.now(),
): boolean {
  switch (attention) {
    case null:
      return true;
    case 'ending-soon':
      return endsWithinDays(campaign, ENDING_SOON_WINDOW_DAYS, now);
    case 'pending-budget':
      return !hasBudget(campaign.budgetTotal);
    case 'registration-open':
      return campaign.registrationOpen;
    case 'auto-approve':
      return campaign.autoApproveRegistrations;
  }
}

/** Unknown or empty query values fall back to "no filter" rather than 404-ing. */
export function parseStatus(raw: string | null | undefined): StatusFilter {
  const value = (raw ?? '').toUpperCase();
  return STATUS_FILTERS.some((tab) => tab.value === value) ? (value as StatusFilter) : 'ALL';
}

export function parseAttention(raw: string | null | undefined): AttentionFilter | null {
  const value = (raw ?? '').toLowerCase();
  return ATTENTION_FILTERS.some((option) => option.value === value)
    ? (value as AttentionFilter)
    : null;
}

export function parsePlatform(raw: string | null | undefined): CampaignPlatform | null {
  const value = (raw ?? '').toLowerCase();
  return KNOWN_PLATFORMS.includes(value as CampaignPlatform) ? (value as CampaignPlatform) : null;
}

/** Search is a case-insensitive substring over title, brand and category. */
export function matchesSearch(campaign: PublicCampaign, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) {
    return true;
  }
  return [campaign.title, campaign.brand.name, campaign.category].some((field) =>
    field.toLowerCase().includes(term),
  );
}

export function filterCampaigns(
  campaigns: readonly PublicCampaign[],
  filters: CampaignFilters,
  now: number = Date.now(),
): PublicCampaign[] {
  return campaigns.filter(
    (campaign) =>
      (filters.status === 'ALL' || campaign.status === filters.status) &&
      (filters.brand === null || campaign.brandId === filters.brand) &&
      (filters.category === null ||
        campaign.category.toLowerCase() === filters.category.toLowerCase()) &&
      (filters.platform === null || campaign.platforms.includes(filters.platform)) &&
      matchesAttention(campaign, filters.attention, now) &&
      matchesSearch(campaign, filters.search),
  );
}

/** How many dimensions differ from the default view; drives the "Clear filters" affordance. */
export function activeFilterCount(filters: CampaignFilters): number {
  return [
    filters.status !== 'ALL',
    filters.attention !== null,
    filters.brand !== null,
    filters.category !== null,
    filters.platform !== null,
    filters.search.trim().length > 0,
  ].filter(Boolean).length;
}
