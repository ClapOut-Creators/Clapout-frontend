import { PayoutMethod } from '../../core/models/user';

/** Cell helpers shared by the registrations table and the "All clippers" table. */

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  MTN_MOMO: 'MTN MoMo',
  TELECEL_CASH: 'Telecel Cash',
  AT_MONEY: 'AT Money',
};

/** Avatar fallback — the design shows a coloured chip, not a photo. */
export function initials(name: string): string {
  return (
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

/**
 * wa.me target for a creator's WhatsApp value. Steve stores either a username
 * ("@theboywinner") or a phone number ("+233 20 123 4567"), and wa.me accepts
 * both — but a number must be digits only, with no "+", spaces or dashes.
 * A leading "@" is always dropped; anything that is not phone-shaped is passed
 * through as a username.
 */
export function whatsappLink(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim().replace(/^@+/, '');
  if (!raw) {
    return null;
  }
  const isPhoneNumber = /^\+?[\d\s().-]+$/.test(raw);
  const target = isPhoneNumber ? raw.replace(/\D/g, '') : raw;
  return target ? `https://wa.me/${encodeURIComponent(target)}` : null;
}

/**
 * A display handle for a profile URL. The contract only carries the URL, so the
 * last path segment is the closest thing to a handle; a URL with no path (or
 * an unparsable one) falls back to the host.
 */
export function socialHandle(raw: string): string {
  const value = (raw ?? '').trim();
  if (!value) {
    return '';
  }
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, '');
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments.length > 0 ? segments[segments.length - 1] : '';
    if (!last) {
      return host;
    }
    const handle = decodeURIComponent(last).replace(/^@+/, '');
    return handle ? `@${handle}` : host;
  } catch {
    return value;
  }
}
