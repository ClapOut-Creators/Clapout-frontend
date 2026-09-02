import { CampaignPlatform } from '../../features/campaigns/models/campaign';
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
  /** Scopes to every campaign owned by one brand; composes with the others. */
  brandId?: string;
  campaignSlug?: string;
  status?: RegistrationStatus;
  search?: string;
}
