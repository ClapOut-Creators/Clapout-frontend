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

/** "Product" dropdown — sections of the marketing site. */
export const PRODUCT_LINKS: PublicLink[] = [
  { label: 'How it works', href: `${LANDING_SITE_URL}/#how-it-works` },
  { label: 'For brands', href: `${LANDING_SITE_URL}/#brands` },
  { label: 'For creators', href: `${LANDING_SITE_URL}/#creators` },
  { label: 'FAQ', href: `${LANDING_SITE_URL}/#faq` },
];

/**
 * The footer columns as clapoutcreators.com ships them
 * (`src/components/layout/Footer.tsx`). The landing site is a hash-routed SPA,
 * so its own `#…` anchors and `#/…` routes become absolute URLs here — every
 * destination except Campaigns lives on the marketing site, and Campaigns is
 * the page this app already owns.
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
        href: `${LANDING_SITE_URL}/#/guides/how-to-become-a-clipper`,
      },
      {
        label: 'How Much Do Clippers Make?',
        href: `${LANDING_SITE_URL}/#/guides/how-much-do-clippers-make`,
      },
      { label: 'Clipping Side Hustle', href: `${LANDING_SITE_URL}/#/guides/clipping-side-hustle` },
      {
        label: 'Freelance Clipper Guide',
        href: `${LANDING_SITE_URL}/#/guides/freelance-clipper-guide`,
      },
      { label: 'Remote Clipping Jobs', href: `${LANDING_SITE_URL}/#/guides/remote-clipping-jobs` },
      { label: 'Best Editing Tools', href: `${LANDING_SITE_URL}/#/guides/best-editing-tools` },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: `${LANDING_SITE_URL}/#/terms` },
      { label: 'Privacy Policy', href: `${LANDING_SITE_URL}/#/privacy` },
      { label: 'Platform Policies', href: `${LANDING_SITE_URL}/#/policies` },
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
