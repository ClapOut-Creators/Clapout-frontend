import { BrandInput } from './brand';

/**
 * Brand invites (`/admin/brand-invites`, `/public/brand-invites/:token`).
 *
 * Until brands have their own portal an admin generates a single-use link and
 * sends it to the brand's representative, who completes the same three-step
 * brand wizard admins use. Completing it creates the Brand and marks the invite
 * used.
 */

/**
 * EXPIRED is computed server side — a PENDING invite whose `expiresAt` has
 * passed — and is never stored, so nothing here may write it back.
 */
export type BrandInviteStatus = 'PENDING' | 'COMPLETED' | 'REVOKED' | 'EXPIRED';

/** The admin view of an invite, internals included. */
export interface BrandInvite {
  id: string;
  /** 32 random bytes, base64url — the secret half of the link. */
  token: string;
  status: BrandInviteStatus;
  /** Prefill hints the admin already knew; all optional. */
  brandName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  /** International, e.g. '+233201234567'. */
  contactPhone: string | null;
  website: string | null;
  /** Internal note, never shown to the representative. */
  note: string | null;
  /** The partnership inquiry this invite was sent for, when there was one. */
  inquiryId: string | null;
  /** The brand created through this invite. */
  brandId: string | null;
  brand: { id: string; name: string; slug: string } | null;
  createdBy: { id: string; fullName: string };
  expiresAt: string;
  completedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * What the representative's page sees. Deliberately narrower than
 * {@link BrandInvite}: no token echo, no note, no admin identities.
 */
export interface PublicBrandInvite {
  status: BrandInviteStatus;
  brandName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  expiresAt: string;
  /** Set once COMPLETED, so a re-opened link can name the brand it created. */
  completedBrandName: string | null;
}

/** Body for `POST /admin/brand-invites`. Everything is optional but the expiry. */
export interface CreateBrandInviteInput {
  brandName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  note?: string | null;
  /** 1–90, default 14 server side. */
  expiresInDays?: number;
  /** Moves a NEW inquiry to CONTACTED; `422 INQUIRY_NOT_FOUND` when unknown. */
  inquiryId?: string;
}

export interface BrandInviteQuery {
  /** Accepts the computed EXPIRED too. */
  status?: BrandInviteStatus;
  /** brandName / contactName / contactEmail, case-insensitive contains. */
  search?: string;
}

/**
 * Body for `POST /public/brand-invites/:token/complete` — the brand wizard's
 * payload minus `status`; the API always creates the brand ACTIVE.
 */
export type CompleteBrandInvitePayload = Omit<BrandInput, 'status'>;

/** `201` from the public complete endpoint. */
export interface CompletedBrandInvite {
  brand: { id: string; name: string; slug: string };
  invite: PublicBrandInvite;
}
