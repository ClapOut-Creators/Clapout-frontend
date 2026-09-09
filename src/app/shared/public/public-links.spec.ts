import {
  FOOTER_COLUMNS,
  LANDING_CONTACT_URL,
  LANDING_SITE_URL,
  PRODUCT_LINKS,
} from './public-links';

/**
 * The landing site dropped hash routing for real paths (its `useRoute` reads
 * `location.pathname`), keeping `#…` only for home-page sections. Every link
 * that leaves this app for the marketing site has to follow that shape, and
 * only anchors the home page actually renders may be used.
 */
const HOME_SECTIONS = ['how-it-works', 'faq', 'feedback', 'join', 'top'];

const allHrefs = [
  ...PRODUCT_LINKS.map((link) => link.href),
  ...FOOTER_COLUMNS.flatMap((column) => column.links.map((link) => link.href)),
  LANDING_CONTACT_URL,
].filter((href): href is string => typeof href === 'string');

describe('public links to the landing site', () => {
  it('never use the old hash-routed form', () => {
    expect(allHrefs.filter((href) => href.includes('/#/'))).toEqual([]);
  });

  it('only anchor to sections the landing home page renders', () => {
    const anchors = allHrefs
      .filter((href) => href.startsWith(`${LANDING_SITE_URL}/#`))
      .map((href) => href.slice(`${LANDING_SITE_URL}/#`.length));
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors.every((anchor) => HOME_SECTIONS.includes(anchor))).toBe(true);
  });

  it('send Contact to the landing contact page, not a dead anchor', () => {
    expect(LANDING_CONTACT_URL).toBe(`${LANDING_SITE_URL}/contact`);
  });
});
