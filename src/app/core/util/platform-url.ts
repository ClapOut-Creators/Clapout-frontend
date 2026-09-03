import { CampaignPlatform, CampaignStatus } from '../models/campaign';
import { PLATFORM_LABELS, platformLabel } from './campaign-format';

/**
 * Host table mirroring `422 POST_URL_PLATFORM_MISMATCH` in INTEGRATION-PLAN.md.
 * The API is the authority; this copy only exists so a clipper is told about a
 * wrong link before the round trip.
 */
const PLATFORM_HOSTS: Record<CampaignPlatform, readonly string[]> = {
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.watch'],
  x: ['x.com', 'twitter.com'],
};

/** The hosts a post URL may live on, e.g. ['youtube.com', 'youtu.be']. */
export function platformHosts(platform: CampaignPlatform): readonly string[] {
  return PLATFORM_HOSTS[platform] ?? [];
}

/**
 * True when `url` points at `platform`. Any subdomain counts (`www.`, `vm.`,
 * `m.`), matching the backend's check; an unparsable or non-http(s) URL is
 * rejected here and by `httpUrlValidator` alike.
 */
export function isPlatformPostUrl(platform: CampaignPlatform, url: string): boolean {
  const hosts = platformHosts(platform);
  if (hosts.length === 0) {
    return true;
  }
  const trimmed = (url ?? '').trim();
  if (!trimmed) {
    return true;
  }
  let host: string;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    host = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/**
 * Which platform a pasted profile or post link belongs to, or null when it is
 * on none of them (a personal site, a Linktree, an unparsable string).
 *
 * The overlays draw the matching brand glyph inside the field as the clipper
 * types, so this runs on every keystroke and must never throw. Subdomains count
 * the same way {@link isPlatformPostUrl} counts them, and the table is the one
 * the contract defines — there is no second list to keep in step.
 */
export function platformFromUrl(url: string | null | undefined): CampaignPlatform | null {
  const trimmed = (url ?? '').trim();
  if (!trimmed) {
    return null;
  }
  let host: string;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    host = parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [platform, hosts] of Object.entries(PLATFORM_HOSTS) as [
    CampaignPlatform,
    readonly string[],
  ][]) {
    if (hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
      return platform;
    }
  }
  return null;
}

/**
 * "That doesn't look like a TikTok link — paste the link to the clip you posted
 * on TikTok." Written for the clipper, not the contract.
 */
export function platformMismatchMessage(platform: CampaignPlatform): string {
  const label = PLATFORM_LABELS[platform] ?? platformLabel(platform);
  return `That doesn’t look like a ${label} link — paste the link to the clip you posted on ${label}.`;
}

/** 'tiktok.com' / 'youtube.com or youtu.be' — the hint under the post link field. */
export function platformHostHint(platform: CampaignPlatform): string {
  const hosts = platformHosts(platform);
  if (hosts.length === 0) {
    return '';
  }
  return hosts.length === 1 ? hosts[0] : `${hosts.slice(0, -1).join(', ')} or ${hosts.at(-1)}`;
}

/** Placeholder post URL for the platform the clipper registered on. */
export function platformPostPlaceholder(platform: CampaignPlatform): string {
  switch (platform) {
    case 'tiktok':
      return 'https://www.tiktok.com/@yourname/video/1234567890';
    case 'youtube':
      return 'https://youtube.com/shorts/AbCdEfGhIjK';
    case 'instagram':
      return 'https://www.instagram.com/reel/AbCdEfGhIjK/';
    case 'facebook':
      return 'https://www.facebook.com/reel/1234567890';
    default:
      return 'https://x.com/yourname/status/1234567890';
  }
}

/**
 * Submissions are only accepted while the campaign is ACTIVE; every other state
 * gets its own panel on the submit page rather than a failing form.
 */
export function submissionsOpen(status: CampaignStatus | undefined): boolean {
  return status === 'ACTIVE';
}

/**
 * A readable, bounded label for a post link: the protocol and a leading `www.`
 * are dropped and the middle is elided, so `tiktok.com/@ama/video/7411…234` fits
 * a table cell without hiding which account or clip it points at.
 */
export function postUrlLabel(url: string | null | undefined, maxLength = 42): string {
  const raw = (url ?? '').trim();
  if (!raw) {
    return '';
  }
  const bare = raw
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
  if (bare.length <= maxLength) {
    return bare;
  }
  const head = Math.ceil((maxLength - 1) / 2);
  const tail = Math.floor((maxLength - 1) / 2);
  return `${bare.slice(0, head)}…${bare.slice(bare.length - tail)}`;
}
