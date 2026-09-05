import { describe, expect, it } from 'vitest';
import { PublicCampaign } from '../../core/models/campaign';
import {
  activeFilterCount,
  EMPTY_FILTERS,
  endsWithinDays,
  filterCampaigns,
  parseAttention,
  parsePlatform,
  parseStatus,
} from './campaign-filters';

const NOW = Date.parse('2026-09-05T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function campaign(overrides: Partial<PublicCampaign> = {}): PublicCampaign {
  return {
    slug: 'e-wale-clipping',
    title: 'E-WALE Clipping',
    demo: false,
    brandId: 'brand-ewale',
    brand: { name: 'E-wale tech', logoUrl: null, logoBg: '#0B51F0', logoFit: 'contain' },
    status: 'ACTIVE',
    autoApproveRegistrations: false,
    registrationOpen: true,
    platforms: ['tiktok', 'instagram'],
    currency: '₵',
    cpm: 10,
    budgetSpent: 30.63,
    budgetTotal: 2000,
    description: 'Clip the launch.',
    category: 'Product',
    startDate: '2026-09-02T00:00:00Z',
    endDate: new Date(NOW + 20 * DAY).toISOString(),
    avgReviewTime: '1d',
    tags: ['Clipping'],
    bannerUrl: null,
    requirementsNote: null,
    requirementsDocUrl: null,
    resourceLabel: null,
    resourceUrl: null,
    updatedAt: '2026-09-04T00:00:00Z',
    ...overrides,
  };
}

const endingSoon = campaign({
  slug: 'tripadverts',
  title: 'TripAdverts Clipping',
  brandId: 'brand-trip',
  brand: { name: 'TripAdverts', logoUrl: null, logoBg: '#000', logoFit: 'contain' },
  category: 'Service',
  platforms: ['youtube'],
  endDate: new Date(NOW + 2 * DAY).toISOString(),
});

const draft = campaign({
  slug: 'draft',
  title: 'Untitled draft',
  status: 'DRAFT',
  registrationOpen: false,
  budgetTotal: null,
  budgetSpent: null,
  endDate: new Date(NOW + DAY).toISOString(),
});

const autoApprove = campaign({
  slug: 'meetme',
  title: 'Tekme Creatives Meetme',
  brandId: 'brand-tekme',
  category: 'Event',
  autoApproveRegistrations: true,
  platforms: ['tiktok'],
});

const all = [campaign(), endingSoon, draft, autoApprove];

describe('endsWithinDays', () => {
  it('counts an active campaign whose end falls inside the window', () => {
    expect(endsWithinDays(endingSoon, 7, NOW)).toBe(true);
  });

  it('ignores drafts, unannounced end dates, and ends outside the window', () => {
    expect(endsWithinDays(draft, 7, NOW)).toBe(false);
    expect(endsWithinDays(campaign({ endDate: null }), 7, NOW)).toBe(false);
    expect(endsWithinDays(campaign(), 7, NOW)).toBe(false);
    const past = campaign({ endDate: new Date(NOW - DAY).toISOString() });
    expect(endsWithinDays(past, 7, NOW)).toBe(false);
  });
});

describe('filterCampaigns', () => {
  it('returns everything for the default filters', () => {
    expect(filterCampaigns(all, EMPTY_FILTERS, NOW)).toHaveLength(4);
  });

  it('narrows to campaigns ending soon, the dashboard deep link', () => {
    const result = filterCampaigns(all, { ...EMPTY_FILTERS, attention: 'ending-soon' }, NOW);
    expect(result.map((item) => item.slug)).toEqual(['tripadverts']);
  });

  it('narrows to campaigns with no budget announced', () => {
    const result = filterCampaigns(all, { ...EMPTY_FILTERS, attention: 'pending-budget' }, NOW);
    expect(result.map((item) => item.slug)).toEqual(['draft']);
  });

  it('narrows to auto-approving and registration-open campaigns', () => {
    const auto = filterCampaigns(all, { ...EMPTY_FILTERS, attention: 'auto-approve' }, NOW);
    expect(auto.map((item) => item.slug)).toEqual(['meetme']);
    const open = filterCampaigns(all, { ...EMPTY_FILTERS, attention: 'registration-open' }, NOW);
    expect(open).toHaveLength(3);
  });

  it('filters by brand, category and platform independently', () => {
    expect(filterCampaigns(all, { ...EMPTY_FILTERS, brand: 'brand-trip' }, NOW)).toHaveLength(1);
    expect(filterCampaigns(all, { ...EMPTY_FILTERS, category: 'event' }, NOW)).toHaveLength(1);
    expect(filterCampaigns(all, { ...EMPTY_FILTERS, platform: 'tiktok' }, NOW)).toHaveLength(3);
  });

  it('combines every dimension with AND', () => {
    const filters = { ...EMPTY_FILTERS, status: 'ACTIVE' as const, platform: 'tiktok' as const };
    const result = filterCampaigns(all, { ...filters, search: 'meetme' }, NOW);
    expect(result.map((item) => item.slug)).toEqual(['meetme']);
  });

  it('searches title, brand and category case-insensitively', () => {
    expect(filterCampaigns(all, { ...EMPTY_FILTERS, search: 'e-wale TECH' }, NOW)).toHaveLength(3);
    expect(filterCampaigns(all, { ...EMPTY_FILTERS, search: 'service' }, NOW)).toHaveLength(1);
  });
});

describe('query parsing', () => {
  it('accepts known values in any case and ignores the rest', () => {
    expect(parseStatus('active')).toBe('ACTIVE');
    expect(parseStatus('bogus')).toBe('ALL');
    expect(parseAttention('Ending-Soon')).toBe('ending-soon');
    expect(parseAttention(undefined)).toBeNull();
    expect(parsePlatform('TikTok')).toBe('tiktok');
    expect(parsePlatform('myspace')).toBeNull();
  });
});

describe('activeFilterCount', () => {
  it('counts each dimension that moved off its default', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    const two = { ...EMPTY_FILTERS, attention: 'ending-soon' as const, search: ' x ' };
    expect(activeFilterCount(two)).toBe(2);
  });
});
