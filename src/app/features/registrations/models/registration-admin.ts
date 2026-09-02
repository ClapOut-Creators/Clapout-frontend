import { CampaignPlatform } from '../../campaigns/models/campaign';
import { PayoutDetails, SocialAccount } from '../../../core/models/user';
import { RegistrationStatus } from './registration';

/** Admin-only registration contracts (`/admin/registrations`, Bearer + role ADMIN). */

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
