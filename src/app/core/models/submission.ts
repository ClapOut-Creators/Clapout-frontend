import { CampaignPlatform } from './campaign';

/**
 * Content submission contract (`POST /submissions`, `GET /me/submissions`,
 * `DELETE /me/submissions/:id`, `GET /me/stats`).
 *
 * A submission is one posted clip from one ACCEPTED registration. Clippers send
 * the public post link plus a screenshot; admins verify the view count by hand,
 * approve with a frozen payout (`verifiedViews / 1000 * cpm`) and mark the row
 * PAID once the transfer is done. Mirrors INTEGRATION-PLAN.md verbatim.
 */

export type SubmissionStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';

/** The campaign summary embedded in every submission. */
export interface SubmissionCampaign {
  slug: string;
  title: string;
  brandName: string;
  brandLogoUrl: string | null;
  brandLogoBg: string;
  /** Currency symbol, e.g. '₵'. */
  currency: string;
  /** null until the brand announces a rate; approval then fails server side. */
  cpm: number | null;
  /** Human readable review turnaround, e.g. '1d'. */
  avgReviewTime: string;
}

export interface Submission {
  id: string;
  registrationId: string;
  status: SubmissionStatus;
  /** Copied from the registration at submit time. */
  platform: CampaignPlatform;
  /** https URL of the published clip. */
  postUrl: string;
  /** `data:image/*` (client-resized, <= ~700 KB) — proof of the post. */
  screenshotUrl: string;
  caption: string | null;
  /** Views the clipper reported when submitting. */
  claimedViews: number | null;
  /** 'YYYY-MM-DD' the clip went live. */
  postedAt: string | null;
  /** Anything the clipper wants the reviewer to know. */
  note: string | null;
  /** Admin-entered on approval. */
  verifiedViews: number | null;
  /** `verifiedViews / 1000 * cpm`, 2 dp, frozen at approval. */
  payoutAmount: number | null;
  /** Rejection reason / message back to the clipper. */
  reviewNote: string | null;
  reviewedAt: string | null;
  /**
   * When `verifiedViews` was last confirmed: set at approval and again on every
   * admin view check. Equal to `reviewedAt` while the approval figure still
   * stands; null before approval.
   */
  viewsCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
  campaign: SubmissionCampaign;
}

/** Body for `POST /submissions`. */
export interface CreateSubmissionPayload {
  registrationId: string;
  postUrl: string;
  /** `data:image/*`, at most 700 000 characters. */
  screenshotUrl: string;
  caption?: string;
  claimedViews?: number;
  /** 'YYYY-MM-DD'. */
  postedAt?: string;
  note?: string;
}

/** One currency's running total in {@link CreatorStats}. */
export interface CurrencyTotal {
  /** Currency symbol, e.g. '₵'. */
  currency: string;
  amount: number;
}

/** `GET /me/stats` — the clipper's headline numbers. */
export interface CreatorStats {
  /** Registrations, any status. */
  campaigns: number;
  acceptedCampaigns: number;
  /** All statuses. */
  submissions: number;
  /** SUBMITTED | UNDER_REVIEW. */
  pendingSubmissions: number;
  /** Sum of `verifiedViews` over APPROVED | PAID. */
  verifiedViews: number;
  /** Sum of `payoutAmount` over APPROVED | PAID, per currency. */
  earned: CurrencyTotal[];
  /** PAID only, per currency. */
  paid: CurrencyTotal[];
}

/**
 * One row of an approved clip's view history
 * (`GET /admin/submissions/:id/view-checks`, newest first).
 *
 * The first row is written by the approval itself and carries
 * `previousViews: null`; every later row records what the figure was before the
 * admin re-checked it.
 */
export interface SubmissionViewCheck {
  id: string;
  /** The verified figure this check froze. */
  views: number;
  /** What `verifiedViews` was before this check; null for the approval row. */
  previousViews: number | null;
  /** Where the number came from — the admin's own words. */
  note: string | null;
  checkedAt: string;
  checkedBy: { id: string; fullName: string };
}

/** Body for `POST /admin/submissions/:id/view-checks`. */
export interface SubmissionViewCheckInput {
  /** The freshly counted views; the payout is recalculated from it. */
  views: number;
  /** At most 500 characters server side. */
  note?: string;
}
