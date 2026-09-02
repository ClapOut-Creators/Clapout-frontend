/** Links shared by the public navbar and footer. */

export const LANDING_SITE_URL = 'https://clapoutcreators.com';

export interface PublicLink {
  label: string;
  href: string;
}

/** "Product" dropdown — sections of the marketing site. */
export const PRODUCT_LINKS: PublicLink[] = [
  { label: 'How it works', href: `${LANDING_SITE_URL}/#how-it-works` },
  { label: 'For brands', href: `${LANDING_SITE_URL}/#brands` },
  { label: 'For creators', href: `${LANDING_SITE_URL}/#creators` },
  { label: 'FAQ', href: `${LANDING_SITE_URL}/#faq` },
];

export const FOOTER_EXPLORE: PublicLink[] = [
  { label: 'About', href: `${LANDING_SITE_URL}/#about` },
  { label: 'How it works', href: `${LANDING_SITE_URL}/#how-it-works` },
  { label: 'Campaigns', href: '/campaigns' },
  { label: 'FAQ', href: `${LANDING_SITE_URL}/#faq` },
  { label: 'Feedback', href: `${LANDING_SITE_URL}/#feedback` },
];

export const FOOTER_LEGAL: PublicLink[] = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
];

export const FOOTER_CONTACT: PublicLink[] = [
  { label: 'hello@clapout.co', href: 'mailto:hello@clapout.co' },
  { label: 'Accra · Ghana', href: '' },
  { label: 'Join Clapout', href: '/auth/sign-up' },
];
