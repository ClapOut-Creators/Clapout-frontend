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

/**
 * "Product" dropdown. The landing site's own Product menu has two entries —
 * Clippers (the campaign list, which this app owns) and Brand (the partnership
 * form) — and its home page carries `#how-it-works` and `#faq` sections.
 */
export const PRODUCT_LINKS: PublicLink[] = [
  { label: 'For creators', href: '/campaigns' },
  { label: 'For brands', href: `${LANDING_SITE_URL}/contact/partnership` },
  { label: 'How it works', href: `${LANDING_SITE_URL}/#how-it-works` },
  { label: 'FAQ', href: `${LANDING_SITE_URL}/#faq` },
];

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
