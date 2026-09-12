/** Authenticated principal contract (`POST /auth/*`, `GET /me`). */

/** Sign-up always creates a CREATOR; admins are seeded server side. */
export type UserRole = 'CREATOR' | 'ADMIN';

export type PayoutMethod = 'MTN_MOMO' | 'TELECEL_CASH' | 'AT_MONEY';

export interface SocialAccount {
  url: string;
}

export interface PayoutDetails {
  method: PayoutMethod;
  accountNumber: string;
  accountName: string;
}

export interface Me {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  whatsapp: string | null;
  phone: string | null;
  socials: SocialAccount[];
  payout: PayoutDetails | null;
  /**
   * When the creator confirmed joining the WhatsApp community. Null gates a
   * creator into onboarding (see `onboardingGuard`) until they do.
   */
  communityJoinedAt: string | null;
  /**
   * When the creator opened the verification link we emailed at sign-up.
   * Null until then: the API refuses registrations and submissions, and the
   * onboarding flow starts with a "verify your email" step.
   */
  emailVerifiedAt: string | null;
  createdAt: string;
}

/** The partial body `PATCH /me` accepts. */
export interface ProfilePatch {
  fullName?: string;
  whatsapp?: string | null;
  phone?: string | null;
  socials?: SocialAccount[];
  payout?: PayoutDetails | null;
  /** `true` stamps `communityJoinedAt` (first confirmation wins); `false` clears it. */
  communityJoined?: boolean;
}

export interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
  /** WhatsApp username, e.g. '@loverboy_12'. Required at sign-up. */
  whatsapp: string;
  phone: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

/** Envelope returned by `POST /auth/sign-up` and `POST /auth/sign-in`. */
export interface AuthSession {
  token: string;
  user: Me;
  /** Sign-up only: whether the verification email actually went out. */
  verificationSent?: boolean;
}

/** `POST /auth/verify-email` — the account the link belonged to, now verified. */
export interface VerifyEmailResponse {
  ok: true;
  user: Me;
}

/** `POST /auth/resend-verification`. */
export interface ResendVerificationResponse {
  ok: true;
  /** Nothing was sent because the address is already confirmed. */
  alreadyVerified: boolean;
  /** False when the mailer failed; the link was still issued, so a retry works. */
  sent: boolean;
}
