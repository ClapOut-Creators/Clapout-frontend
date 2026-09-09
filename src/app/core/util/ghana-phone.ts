/**
 * Ghana mobile numbers, as the NCA numbering plan defines them: a trunk "0",
 * a two-digit network code in the mobile ranges 20–29 or 50–59, and a
 * seven-digit subscriber number — ten digits nationally, nine after +233.
 * (024 123 4567, +233 24 123 4567, 00233241234567 are all the same number.)
 *
 * The ranges are checked rather than the individual codes in use today
 * (020, 023, 024, 025, 026, 027, 028, 050, 053, 054, 055, 056, 057, 059),
 * because the NCA allocates new codes inside the same ranges — MTN's 059-7/8/9
 * and 025-6/7 blocks arrived that way — and a rule pinned to today's list would
 * turn away genuine Ghanaian sign-ups the day a new block goes live.
 */

/** The stored form: "+233" and the nine national digits after the trunk "0". */
export const GHANA_DIAL_CODE = '+233';

/**
 * The canonical `+233XXXXXXXXX` for anything a Ghanaian would type — national,
 * international, with or without spaces, dashes or brackets — or null when the
 * digits are not a Ghana mobile number at all.
 */
export function normalizeGhanaMobile(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  let national: string;
  if (digits.startsWith('00233')) {
    national = digits.slice(5);
  } else if (digits.startsWith('233')) {
    national = digits.slice(3);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }
  return /^[25]\d{8}$/.test(national) ? `${GHANA_DIAL_CODE}${national}` : null;
}

export function isGhanaMobile(raw: string | null | undefined): boolean {
  return normalizeGhanaMobile(raw) !== null;
}

/** "024 123 4567" from "+233241234567", for prefilled forms. */
export function toNationalGhanaMobile(stored: string | null | undefined): string {
  const normalized = normalizeGhanaMobile(stored);
  if (!normalized) {
    return (stored ?? '').trim();
  }
  const national = `0${normalized.slice(GHANA_DIAL_CODE.length)}`;
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}
