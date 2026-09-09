/**
 * Public campaign contract served by the ClapOut backend
 * (`GET /public/campaigns`, `GET /public/campaigns/:slug`).
 *
 * Mirrors the shared API contract in INTEGRATION-PLAN.md verbatim; do not widen
 * these types without a matching backend change.
 */

export type CampaignPlatform =
  'tiktok' | 'x' | 'facebook' | 'instagram' | 'youtube' | 'snapchat' | 'whatsapp';

/**
 * `DRAFT` campaigns exist only in the admin section — the public endpoints never
 * return them. `UPCOMING` campaigns are announced but not open yet: clients
 * count down to `startDate` and render unannounced money fields as
 * `${currency}—`.
 */
export type CampaignStatus = 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'CLOSED';

export interface CampaignBrand {
  /** Brand display name, e.g. 'E-wale tech'. */
  name: string;
  /** Absolute logo URL, or null when the brand has no artwork yet. */
  logoUrl: string | null;
  /** Hex background the logo is rendered on, e.g. '#0B51F0'. */
  logoBg: string;
  logoFit: 'cover' | 'contain';
}

export interface PublicCampaign {
  slug: string;
  title: string;
  /** Demo/dummy campaigns seeded for the landing page. */
  demo: boolean;
  /** FK to the owning Brand. */
  brandId: string;
  /** Denormalised from the Brand relation for rendering. */
  brand: CampaignBrand;
  status: CampaignStatus;
  /** Registrations are ACCEPTED on creation instead of queued for admin review. */
  autoApproveRegistrations: boolean;
  /**
   * `status === 'ACTIVE' && startDate <= now && (endDate == null || now < endDate)`,
   * computed server side.
   */
  registrationOpen: boolean;
  platforms: CampaignPlatform[];
  /** Currency symbol, e.g. '₵' or '$'. */
  currency: string;
  /** null until the brand announces it. */
  cpm: number | null;
  /** null until the brand announces the budget. */
  budgetSpent: number | null;
  /** null until the brand announces the budget. */
  budgetTotal: number | null;
  description: string;
  category: string;
  /** ISO date or datetime; for UPCOMING this is when registration opens. */
  startDate: string;
  /** ISO datetime; null = not announced yet. */
  endDate: string | null;
  /** Human readable review turnaround, e.g. '1d'. */
  avgReviewTime: string;
  /**
   * Registrations received so far — the participants pill on the public card.
   * Optional while the backend rolls the field out; clients must render the
   * unannounced em dash rather than 0 when it is absent.
   */
  registrationCount?: number;
  tags: string[];
  bannerUrl: string | null;
  requirementsNote: string | null;
  requirementsDocUrl: string | null;
  resourceLabel: string | null;
  resourceUrl: string | null;
  updatedAt: string;
}
