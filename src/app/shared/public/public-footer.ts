import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FOOTER_CONTACT, FOOTER_EXPLORE, FOOTER_LEGAL } from './public-links';

/**
 * The landing site's dark footer (Figma 344:1182): logo, blurb, three link
 * columns, the copyright rule, and the oversized "CLAPOUT" watermark bleeding
 * off the bottom edge.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-public-footer',
  templateUrl: './public-footer.html',
})
export class PublicFooter {
  protected readonly explore = FOOTER_EXPLORE;
  protected readonly legal = FOOTER_LEGAL;
  protected readonly contact = FOOTER_CONTACT;
  protected readonly year = new Date().getFullYear();

  /** Internal routes go through the router; marketing/mailto links stay plain. */
  protected isInternal(href: string): boolean {
    return href.startsWith('/');
  }
}
