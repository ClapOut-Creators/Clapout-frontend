/** Links shared by the public navbar and footer. */

export const LANDING_SITE_URL = 'https://clapoutcreators.com';

export interface PublicLink {
  label: string;
  /** Absolute URL, `mailto:`, an in-app route, or `null` for plain text. */
  href: string | null;
}

export interface FooterColumn {
  title: string;
  links: PublicLink[];
}

/** The marketing site's contact page; also where "Contact" in the navbar goes. */
export const LANDING_CONTACT_URL = `${LANDING_SITE_URL}/contact`;

/** One card in the Product menu: an icon tile, a label and a one-line description. */
export interface ProductLink extends PublicLink {
  href: string;
  description: string;
  icon: 'scissors' | 'briefcase';
}

/**
 * "Product" dropdown, exactly the landing site's (`src/data/nav.ts`): Clippers
 * is the campaign list this app owns, Brand is the partnership form on the
 * marketing site.
 */
export const PRODUCT_LINKS: ProductLink[] = [
  {
    label: 'Clippers',
    href: '/campaigns',
    description: 'Get paid for clip videos',
    icon: 'scissors',
  },
  {
    label: 'Brand',
    href: `${LANDING_SITE_URL}/contact/partnership`,
    description: 'Run and manage a campaign',
    icon: 'briefcase',
  },
];

/** The marketing site's campaign list — where Back goes for a visitor who came from it. */
export const LANDING_CAMPAIGNS_URL = `${LANDING_SITE_URL}/campaigns`;

/**
 * True when the visitor reached this page from the marketing site, judged by
 * the referrer's origin (the default referrer policy still sends the origin
 * cross-site). Back and the logo then return them there, so the two sites
 * feel like one.
 */
export function cameFromLandingSite(referrer: string = document.referrer): boolean {
  return referrer.startsWith(`${LANDING_SITE_URL}/`) || referrer === LANDING_SITE_URL;
}

/**
 * The footer columns as clapoutcreators.com ships them
 * (`src/components/layout/Footer.tsx`). The landing site routes by real path
 * (`/guides/…`, `/terms`) with `#…` anchors only for home-page sections, so
 * those become absolute URLs here — every destination except Campaigns lives
 * on the marketing site, and Campaigns is the page this app already owns.
 */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Explore',
    links: [
      { label: 'How it works', href: `${LANDING_SITE_URL}/#how-it-works` },
      { label: 'Campaigns', href: '/campaigns' },
      { label: 'FAQ', href: `${LANDING_SITE_URL}/#faq` },
      { label: 'Feedback', href: `${LANDING_SITE_URL}/#feedback` },
    ],
  },
  {
    title: 'Guides',
    links: [
      {
        label: 'How to Become a Clipper?',
        href: `${LANDING_SITE_URL}/guides/how-to-become-a-clipper`,
      },
      {
        label: 'How Much Do Clippers Make?',
        href: `${LANDING_SITE_URL}/guides/how-much-do-clippers-make`,
      },
      { label: 'Clipping Side Hustle', href: `${LANDING_SITE_URL}/guides/clipping-side-hustle` },
      {
        label: 'Freelance Clipper Guide',
        href: `${LANDING_SITE_URL}/guides/freelance-clipper-guide`,
      },
      { label: 'Remote Clipping Jobs', href: `${LANDING_SITE_URL}/guides/remote-clipping-jobs` },
      { label: 'Best Editing Tools', href: `${LANDING_SITE_URL}/guides/best-editing-tools` },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: `${LANDING_SITE_URL}/terms` },
      { label: 'Privacy Policy', href: `${LANDING_SITE_URL}/privacy` },
      { label: 'Platform Policies', href: `${LANDING_SITE_URL}/policies` },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'clapoutcreators@gmail.com', href: 'mailto:clapoutcreators@gmail.com' },
      { label: 'Accra · Ghana', href: null },
      { label: 'Join Clapout', href: `${LANDING_SITE_URL}/#join` },
    ],
  },
];
