import { CampaignPlatform, PublicCampaign } from '../../campaigns/models/campaign';

/** Campaign application contract (`POST /registrations`, `GET /me/registrations`). */

export type RegistrationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';

/**
 * The campaign embedded in a registration.
 *
 * The backend is moving this from a flat five-field summary to the same
 * `PublicCampaign` body `GET /public/campaigns` serves, so the clipper
 * dashboard can draw the real campaign card. Every field is optional here
 * because both shapes are in flight: run the value through
 * `registrationCampaign()` before rendering rather than reading it directly.
 */
export type RegistrationCampaign = Partial<PublicCampaign> &
  Pick<PublicCampaign, 'slug' | 'title'> & {
    /** Pre-2026-09 flat fields. Remove once every environment sends `brand`. */
    brandName?: string;
    brandLogoUrl?: string | null;
    brandLogoBg?: string;
  };

/** Sensible neutrals for a campaign the API has not fully described yet. */
const FALLBACK_LOGO_BG = '#151515';

/**
 * Normalises either contract into a `PublicCampaign` the shared card can
 * render. Money, platforms and counts stay null/empty when they are missing, so
 * the card shows its "not announced" states instead of inventing zeros.
 */
export function registrationCampaign(campaign: RegistrationCampaign): PublicCampaign {
  return {
    slug: campaign.slug,
    title: campaign.title || (campaign.brand?.name ?? campaign.brandName ?? ''),
    demo: campaign.demo ?? false,
    brandId: campaign.brandId ?? '',
    brand: campaign.brand ?? {
      name: campaign.brandName ?? '',
      logoUrl: campaign.brandLogoUrl ?? null,
      logoBg: campaign.brandLogoBg || FALLBACK_LOGO_BG,
      logoFit: 'cover',
    },
    status: campaign.status ?? 'ACTIVE',
    registrationOpen: campaign.registrationOpen ?? false,
    platforms: campaign.platforms ?? [],
    currency: campaign.currency ?? '',
    cpm: campaign.cpm ?? null,
    budgetSpent: campaign.budgetSpent ?? null,
    budgetTotal: campaign.budgetTotal ?? null,
    description: campaign.description ?? '',
    category: campaign.category ?? '',
    startDate: campaign.startDate ?? '',
    endDate: campaign.endDate ?? null,
    avgReviewTime: campaign.avgReviewTime ?? '',
    registrationCount: campaign.registrationCount,
    tags: campaign.tags ?? [],
    bannerUrl: campaign.bannerUrl ?? null,
    requirementsNote: campaign.requirementsNote ?? null,
    requirementsDocUrl: campaign.requirementsDocUrl ?? null,
    resourceLabel: campaign.resourceLabel ?? null,
    resourceUrl: campaign.resourceUrl ?? null,
    updatedAt: campaign.updatedAt ?? '',
  };
}

export interface Registration {
  id: string;
  status: RegistrationStatus;
  platform: CampaignPlatform;
  /** Creator's account/profile URL on the selected platform. */
  accountUrl: string;
  note: string | null;
  createdAt: string;
  campaign: RegistrationCampaign;
}

export interface CreateRegistrationPayload {
  campaignSlug: string;
  platform: CampaignPlatform;
  accountUrl: string;
  note?: string;
}
