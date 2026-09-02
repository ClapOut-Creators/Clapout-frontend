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
