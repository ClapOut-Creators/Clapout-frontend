/**
 * Composing (and sharing) the single-use brand onboarding link.
 *
 * The API only ever returns the token — the platform owns the URL, so the link
 * always points at whichever origin the admin is actually using (localhost,
 * a preview deployment, production) with no URL base to configure server side.
 */

/** Path the public onboarding page is mounted on. */
export const BRAND_ONBOARDING_PATH = '/brand/onboard';

/** Where a brand's representative should be told to write in. */
export const CLAPOUT_CONTACT_EMAIL = 'clapoutcreators@gmail.com';

function currentOrigin(): string {
  return typeof window === 'undefined' ? '' : window.location.origin;
}

/** `https://studio.clapout…/brand/onboard/<token>` */
export function brandInviteLink(token: string, origin: string = currentOrigin()): string {
  return `${origin.replace(/\/+$/, '')}${BRAND_ONBOARDING_PATH}/${encodeURIComponent(token)}`;
}

/**
 * The message the admin sends. Named when we already know the brand, generic
 * when the invite was created without a name hint.
 */
export function brandInviteMessage(link: string, brandName?: string | null): string {
  const name = brandName?.trim();
  const opening = name
    ? `Hi! Here is your ClapOut link to set up ${name}.`
    : 'Hi! Here is your ClapOut link to set up your brand.';
  return `${opening} It takes about two minutes and the ClapOut team will follow up once you are done: ${link}`;
}

/**
 * `https://wa.me/<digits>?text=<message>`.
 *
 * wa.me accepts digits only, so every space, dash, bracket and the leading '+'
 * are dropped. Returns null when the number carries no digits at all, which is
 * how callers know not to offer the button.
 */
export function whatsappShareUrl(phone: string | null | undefined, message: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
