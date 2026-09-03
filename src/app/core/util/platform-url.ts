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
  snapchat: ['snapchat.com'],
  /**
   * A WhatsApp status has no public URL, so the contract skips the host check
   * for it entirely: the clipper links the story video wherever it lives (a
   * Drive file, for instance) and the screenshot carries the proof.
   */
  whatsapp: [],
};

/**
 * The guidance shown in place of a host list for a platform that has none.
 * Keyed by platform because "no host" is not one situation: today only a
 * WhatsApp status qualifies, and the copy has to say what to paste instead.
 */
const HOSTLESS_HINTS: Partial<Record<CampaignPlatform, string>> = {
  whatsapp:
    'WhatsApp stories have no public link — paste a link to the story video (a Drive link is fine) and add the screenshot.',
};

/**
 * Hosts that identify a platform to {@link platformFromUrl}, which only decides
 * which brand glyph to draw beside a pasted link. It is {@link PLATFORM_HOSTS}
 * plus the WhatsApp hosts: those may not gate a submission (a status link is
 * never on them), but a `wa.me` link pasted into a profile field is plainly
 * WhatsApp and should be drawn as such.
 */
const GLYPH_HOSTS: Record<CampaignPlatform, readonly string[]> = {
  ...PLATFORM_HOSTS,
  whatsapp: ['whatsapp.com', 'wa.me'],
};

/** The hosts a post URL may live on, e.g. ['youtube.com', 'youtu.be']. */
export function platformHosts(platform: CampaignPlatform): readonly string[] {
  return PLATFORM_HOSTS[platform] ?? [];
}

/**
 * True when `url` points at `platform`. Any subdomain counts (`www.`, `vm.`,
 * `m.`), matching the backend's check; an unparsable or non-http(s) URL is
 * rejected here and by `httpUrlValidator` alike.
 *
 * A platform with no host list (WhatsApp) skips the check altogether, exactly as
 * the backend does — every link passes, and the URL shape stays the field's own
 * `type="url"` validator's business.
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
 * the same way {@link isPlatformPostUrl} counts them, over {@link GLYPH_HOSTS}
 * — the contract's table plus the WhatsApp hosts a submission may not be judged
 * on.
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
  for (const [platform, hosts] of Object.entries(GLYPH_HOSTS) as [
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
 *
 * A platform with no host list can never mismatch, so rather than accuse a
 * clipper of a wrong link that {@link isPlatformPostUrl} just accepted, it
 * falls back to the same guidance the field's hint carries.
 */
export function platformMismatchMessage(platform: CampaignPlatform): string {
  if (platformHosts(platform).length === 0) {
    return platformHostHint(platform);
  }
  const label = PLATFORM_LABELS[platform] ?? platformLabel(platform);
  return `That doesn’t look like a ${label} link — paste the link to the clip you posted on ${label}.`;
}

/**
 * 'tiktok.com' / 'youtube.com or youtu.be' — the hint under the post link field.
 * A platform with no hosts gets its own sentence instead of an empty line,
 * because "no host to check" is the one thing the clipper has to be told.
 */
export function platformHostHint(platform: CampaignPlatform): string {
  const hosts = platformHosts(platform);
  if (hosts.length === 0) {
    return HOSTLESS_HINTS[platform] ?? '';
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
    case 'snapchat':
      return 'https://www.snapchat.com/spotlight/AbCdEfGhIjK';
    case 'whatsapp':
      // No public status URL exists, so the example is where the video lives.
      return 'https://drive.google.com/file/d/AbCdEfGhIjK/view';
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
