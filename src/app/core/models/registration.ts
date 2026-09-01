import { CampaignPlatform, CampaignStatus } from './campaign';

/** Campaign application contract (`POST /registrations`, `GET /me/registrations`). */

export type RegistrationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';

/** Embedded campaign summary the API returns with every registration. */
export interface RegistrationCampaign {
  slug: string;
  title: string;
  brandName: string;
  brandLogoUrl: string | null;
  brandLogoBg: string;
  currency: string;
  cpm: number | null;
  endDate: string | null;
  status: CampaignStatus;
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
