/**
 * Country dialling codes for the sign-up phone field, and the rule that folds a
 * code plus a locally typed number into the single international string the API
 * stores on `SignUpPayload.phone`.
 */

export interface PhoneCode {
  /** Overlay label, e.g. 'Ghana (+233)'. */
  label: string;
  /** International prefix, '+' included. */
  dialCode: string;
  /**
   * ISO 3166-1 alpha-2. This — not the dial code — is the select's value,
   * because dial codes are not unique: the US and Canada both answer to +1.
   */
  iso: string;
}

/** Ghana first — the platform's home market — then the rest of ClapOut's reach. */
export const PHONE_CODES: PhoneCode[] = [
  { label: 'Ghana (+233)', dialCode: '+233', iso: 'GH' },
  { label: 'Nigeria (+234)', dialCode: '+234', iso: 'NG' },
  { label: 'Kenya (+254)', dialCode: '+254', iso: 'KE' },
  { label: 'South Africa (+27)', dialCode: '+27', iso: 'ZA' },
  { label: 'Côte d’Ivoire (+225)', dialCode: '+225', iso: 'CI' },
  { label: 'Senegal (+221)', dialCode: '+221', iso: 'SN' },
  { label: 'Tanzania (+255)', dialCode: '+255', iso: 'TZ' },
  { label: 'Uganda (+256)', dialCode: '+256', iso: 'UG' },
  { label: 'Rwanda (+250)', dialCode: '+250', iso: 'RW' },
  { label: 'Egypt (+20)', dialCode: '+20', iso: 'EG' },
  { label: 'Morocco (+212)', dialCode: '+212', iso: 'MA' },
  { label: 'United Kingdom (+44)', dialCode: '+44', iso: 'GB' },
  { label: 'United States (+1)', dialCode: '+1', iso: 'US' },
  { label: 'Canada (+1)', dialCode: '+1', iso: 'CA' },
  { label: 'Germany (+49)', dialCode: '+49', iso: 'DE' },
  { label: 'France (+33)', dialCode: '+33', iso: 'FR' },
  { label: 'Netherlands (+31)', dialCode: '+31', iso: 'NL' },
  { label: 'United Arab Emirates (+971)', dialCode: '+971', iso: 'AE' },
  { label: 'India (+91)', dialCode: '+91', iso: 'IN' },
];

/** Ghana, the sign-up default the design shows. */
export const DEFAULT_PHONE_ISO = 'GH';

/** Dial code for an ISO code, falling back to the default country. */
export function dialCodeFor(iso: string): string {
  const match = PHONE_CODES.find((entry) => entry.iso === iso);
  return (match ?? PHONE_CODES[0]).dialCode;
}

/**
 * Joins the selected country code with the number as typed into one
 * international string.
 *
 * The admin clippers table turns this value into a `wa.me` link, and wa.me only
 * accepts digits — so every space, dash, bracket and dot is dropped, and so is
 * the national trunk '0', which is meaningless once a country code is present.
 * A number the visitor typed with its own leading '+' is trusted as already
 * international and keeps the code it carries.
 *
 *   '+233' + '0201234567'      -> '+233201234567'
 *   '+233' + '020 123 4567'    -> '+233201234567'
 *   '+234' + '(0)803-123-4567' -> '+2348031234567'
 *   '+233' + '+44 7700 900123' -> '+447700900123'
 *   '+233' + '   '             -> ''
 */
export function toInternationalPhone(dialCode: string, localNumber: string): string {
  const typed = localNumber.trim();
  const digits = typed.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  if (typed.startsWith('+')) {
    return `+${digits}`;
  }
  return `+${dialCode.replace(/\D/g, '')}${digits.replace(/^0/, '')}`;
}
