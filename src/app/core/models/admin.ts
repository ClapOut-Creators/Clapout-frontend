import { CampaignPlatform } from './campaign';
import { PayoutDetails, SocialAccount } from './user';
import { RegistrationStatus } from './registration';
import { Submission, SubmissionStatus } from './submission';

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
  /**
   * SUBMITTED | UNDER_REVIEW submissions. Optional while the backend rolls the
   * field out, so an older API never renders a misleading zero.
   */
  pendingSubmissions?: number;
  /** Partnership inquiries still at status NEW. Optional for the same reason. */
  newInquiries?: number;
  /**
   * Brand invites that are PENDING and not yet expired. Optional for the same
   * reason — an older API must not render a misleading zero.
   */
  pendingBrandInvites?: number;
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

/**
 * Body for `POST /admin/campaigns` and (partially) `PATCH /admin/campaigns/:slug`.
 * Everything except title/brand/description/category/currency/platforms is
 * optional so a half-finished draft can always be saved.
 */
export interface CampaignDraftInput {
  title: string;
  slug?: string;
  demo?: boolean;
  /** Campaigns are owned by a Brand; identity comes from the brand record. */
  brandId: string;
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

// --------------------------------------------------------------- submissions

/** The creator behind a submission, with the contact + payout details admins need. */
export interface AdminSubmissionCreator {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string | null;
  phone: string | null;
  payout: PayoutDetails | null;
}

/** The registration a submission was posted under. */
export interface AdminSubmissionRegistration {
  id: string;
  platform: CampaignPlatform;
  accountUrl: string;
}

/** Row in the admin review table (`GET /admin/submissions`). */
export interface AdminSubmission extends Submission {
  creator: AdminSubmissionCreator;
  registration: AdminSubmissionRegistration;
  /** History rows on this clip, the approval's own check included. */
  viewCheckCount: number;
}

export interface AdminSubmissionQuery {
  campaignSlug?: string;
  /** Scopes to every campaign owned by one brand; composes with the others. */
  brandId?: string;
  registrationId?: string;
  status?: SubmissionStatus;
  /** Matches creator name / email and the post URL, case-insensitive contains. */
  search?: string;
  /**
   * Narrows to APPROVED clips on live campaigns whose views were last confirmed
   * more than N days ago — the queue of boards that have gone stale.
   */
  staleViewsDays?: number;
}

/** Body for `PATCH /admin/submissions/:id`. */
export interface AdminSubmissionUpdate {
  status: SubmissionStatus;
  /** Required by APPROVED unless the row already carries a value. */
  verifiedViews?: number | null;
  /** Empty string clears the note server side. */
  reviewNote?: string;
}

// ------------------------------------------------------- partnership inquiries

export type InquiryStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';

/** A brand's "Partnership Inquiry" from the landing page. */
export interface PartnershipInquiry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  /** International, e.g. '+233201234567'. */
  phone: string;
  /** "What are you promoting". */
  promoting: string;
  /** Website / socials / app link — free text, not validated as a URL. */
  link: string;
  /** 'TikTok' | 'Instagram Reels' | 'YouTube Shorts' | 'Mixed' (free text). */
  contentType: string;
  /** 'ASAP' | 'Within 2 weeks' | … (free text). */
  timeline: string;
  /** 'GH₵2,000 – 5,000' … (free text). */
  budget: string;
  notes: string | null;
  source: 'landing';
  /** Web3Forms accepted the notification email. */
  emailDelivered: boolean;
  status: InquiryStatus;
  adminNote: string | null;
  /** Set once the inquiry has been converted into a Brand. */
  brandId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInquiryQuery {
  status?: InquiryStatus;
  /** Matches name / email / company / promoting, case-insensitive contains. */
  search?: string;
}

/**
 * Body for `PATCH /admin/partnership-inquiries/:id`. A `brandId` sent without a
 * `status` moves NEW/CONTACTED to CONVERTED server side.
 */
export interface AdminInquiryUpdate {
  status?: InquiryStatus;
  /** Empty string clears the note server side. */
  adminNote?: string;
  brandId?: string;
}
