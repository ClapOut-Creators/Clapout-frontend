import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FOOTER_COLUMNS } from './public-links';

/**
 * The landing site's dark footer, ported from clapoutcreators.com
 * (`src/components/layout/Footer.tsx`): logo + blurb over a 12-column grid of
 * Explore / Guides / Legal / Contact, the copyright rule, and the oversized
 * "CLAPOUT" wordmark bleeding off the bottom edge.
 *
 * Everything but Campaigns points back at the marketing site, so the studio's
 * public pages read as one site with it.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-public-footer',
  templateUrl: './public-footer.html',
})
export class PublicFooter {
  protected readonly columns = FOOTER_COLUMNS;
  protected readonly year = new Date().getFullYear();

  /** In-app routes go through the router; marketing and mailto links stay plain. */
  protected isInternal(href: string): boolean {
    return href.startsWith('/');
  }
}
