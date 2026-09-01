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
  createdAt: string;
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
}
