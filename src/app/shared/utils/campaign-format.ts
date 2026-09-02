import { CampaignPlatform, CampaignStatus } from '../../core/models/campaign';
import { RegistrationStatus } from '../../core/models/registration';

/** Severities accepted by `p-tag` / `p-message`. */
export type TagTone = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

/** Rendered wherever the backend has not announced a value yet. */
export const NOT_ANNOUNCED = '—';

export const PLATFORM_LABELS: Record<CampaignPlatform, string> = {
  tiktok: 'TikTok',
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

export function platformLabel(platform: CampaignPlatform): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

/** '14 July 2026' — matches the landing page's `en-GB` long date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return NOT_ANNOUNCED;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** '1 September 2026, 11:00' — used for the moment an upcoming campaign opens. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return NOT_ANNOUNCED;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Currency is a symbol in this contract ('₵', '$'), so it simply prefixes the
 * amount. Unannounced amounts render as '₵—' rather than '₵0'.
 */
export function formatMoney(currency: string, amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return `${currency}${NOT_ANNOUNCED}`;
  }
  return `${currency}${amount.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

/** A budget only exists once the brand announces a positive total. */
export function hasBudget(total: number | null | undefined): boolean {
  return total !== null && total !== undefined && Number.isFinite(total) && total > 0;
}

/** 0-100. Returns 0 whenever the budget is unannounced, so callers never divide by null. */
export function budgetPercent(
  spent: number | null | undefined,
  total: number | null | undefined,
): number {
  if (!hasBudget(total)) {
    return 0;
  }
  const safeSpent = spent !== null && spent !== undefined && Number.isFinite(spent) ? spent : 0;
  return Math.min(100, Math.max(0, (safeSpent / (total as number)) * 100));
}

/**
 * Live countdown label mirroring the landing card: a date-only `endDate` runs
 * through the end of that day, a full datetime is the exact deadline. A null
 * `endDate` means the brand has not announced one.
 */
export function daysLeftLabel(
  endDate: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!endDate) {
    return NOT_ANNOUNCED;
  }
  const end = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59`);
  if (Number.isNaN(end.getTime())) {
    return NOT_ANNOUNCED;
  }
  const remainingMs = end.getTime() - now;
  if (remainingMs < 0) {
    return 'Ended';
  }
  const remainingDays = Math.floor(remainingMs / 86_400_000);
  return remainingDays === 0 ? 'Ends today' : `${remainingDays} Days left`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * 'HH:MM:SS' until `startDate`, or null when there is nothing to count down to
 * (missing, unparsable, or already in the past) so callers can fall back to a
 * static label.
 */
export function openCountdownLabel(
  startDate: string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!startDate) {
    return null;
  }
  const start = new Date(startDate).getTime();
  if (Number.isNaN(start)) {
    return null;
  }
  const remainingMs = start - now;
  if (remainingMs <= 0) {
    return null;
  }
  const totalSeconds = Math.floor(remainingMs / 1000);
  return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
}

/**
 * Design-spec money: two decimals with a thin space after the symbol
 * ("₵ 2,000.00"). Unannounced amounts render "₵ —".
 */
export function formatMoneyExact(currency: string, amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return `${currency}\u2009${NOT_ANNOUNCED}`;
  }
  return `${currency}\u2009${amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * The time label on a campaign card. Only ACTIVE and UPCOMING campaigns count
 * down: a DRAFT has no schedule yet and a CLOSED one has ended, so neither may
 * borrow the "N Days left" copy.
 */
export function campaignTimeLabel(
  campaign: { status: CampaignStatus; startDate: string; endDate: string | null },
  now: number = Date.now(),
): string {
  if (campaign.status === 'DRAFT') {
    return 'Not scheduled';
  }
  if (campaign.status === 'CLOSED') {
    return 'Ended';
  }
  if (campaign.status === 'UPCOMING') {
    const start = new Date(campaign.startDate).getTime();
    if (Number.isNaN(start)) {
      return 'Not scheduled';
    }
    const remainingMs = start - now;
    if (remainingMs <= 0) {
      return 'Opening now';
    }
    const days = Math.floor(remainingMs / 86_400_000);
    return days === 0 ? 'Opens today' : `Opens in ${days} days`;
  }
  return daysLeftLabel(campaign.endDate, now);
}

const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  UPCOMING: 'Upcoming',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
};

const CAMPAIGN_STATUS_TONES: Record<CampaignStatus, TagTone> = {
  DRAFT: 'contrast',
  UPCOMING: 'warn',
  ACTIVE: 'success',
  CLOSED: 'secondary',
};

export function campaignStatusLabel(status: CampaignStatus): string {
  return CAMPAIGN_STATUS_LABELS[status] ?? status;
}

export function campaignStatusTone(status: CampaignStatus): TagTone {
  return CAMPAIGN_STATUS_TONES[status] ?? 'secondary';
}

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

const REGISTRATION_STATUS_TONES: Record<RegistrationStatus, TagTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warn',
  ACCEPTED: 'success',
  REJECTED: 'danger',
};

export function registrationStatusLabel(status: RegistrationStatus): string {
  return REGISTRATION_STATUS_LABELS[status] ?? status;
}

export function registrationStatusTone(status: RegistrationStatus): TagTone {
  return REGISTRATION_STATUS_TONES[status] ?? 'secondary';
}
