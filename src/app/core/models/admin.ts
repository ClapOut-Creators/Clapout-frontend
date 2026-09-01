import { CampaignPlatform } from './campaign';
import { PayoutDetails, SocialAccount } from './user';
import { RegistrationStatus } from './registration';

/** Admin-only contracts (`/admin/*`, Bearer + role ADMIN, else 403 FORBIDDEN). */

/** One zero-filled day of the 21-day registration activity series. */
export interface RegistrationActivityPoint {
  /** 'YYYY-MM-DD' */
  date: string;
  count: number;
}

export interface AdminStats {
  publishedCampaigns: number;
  totalCreators: number;
  totalBrands: number;
  newRegistrations7d: number;
  awaitingReview: number;
  registrationActivity: RegistrationActivityPoint[];
}

/** The creator behind a registration, with the contact + payout details admins need. */
export interface AdminRegistrationCreator {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string | null;
  phone: string | null;
  socials: SocialAccount[];
  payout: PayoutDetails | null;
}

export interface AdminRegistrationCampaign {
  slug: string;
  title: string;
  brandName: string;
}

/** Powers the "Registered Clippers" tables. */
export interface AdminRegistration {
  id: string;
  status: RegistrationStatus;
  platform: CampaignPlatform;
  accountUrl: string;
  note: string | null;
  createdAt: string;
  creator: AdminRegistrationCreator;
  campaign: AdminRegistrationCampaign;
}

export interface AdminRegistrationQuery {
  campaignSlug?: string;
  status?: RegistrationStatus;
  search?: string;
}

/** Brand fields carried inline on a campaign row. */
export interface CampaignBrandInput {
  name: string;
  logoUrl?: string | null;
  logoBg?: string;
  logoFit?: 'cover' | 'contain';
}

/**
 * Body for `POST /admin/campaigns` and (partially) `PATCH /admin/campaigns/:slug`.
 * Everything except title/brand/description/category/currency/platforms is
 * optional so a half-finished draft can always be saved.
 */
export interface CampaignDraftInput {
  title: string;
  slug?: string;
  demo?: boolean;
  brand: CampaignBrandInput;
  description: string;
  category: string;
  currency: string;
  cpm?: number | null;
  budgetTotal?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  platforms: CampaignPlatform[];
  tags?: string[];
  bannerUrl?: string | null;
  requirementsNote?: string | null;
  requirementsDocUrl?: string | null;
  resourceLabel?: string | null;
  resourceUrl?: string | null;
}

/**
 * `422 INCOMPLETE` from `POST /admin/campaigns/:slug/publish` lists the fields
 * that still need values.
 */
export interface PublishIncompleteDetails {
  missing: string[];
}
