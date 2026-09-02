import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChevronDown } from '@primeicons/angular/chevron-down';
import { Bars } from '@primeicons/angular/bars';
import { DrawerModule } from 'primeng/drawer';
import { PopoverModule } from 'primeng/popover';
import { LANDING_SITE_URL, PRODUCT_LINKS } from './public-links';

/**
 * The landing site's floating pill navbar, shown to anonymous visitors on the
 * public pages (Figma 344:1182). Geometry from the node spec at 1728: a
 * 1537x96 pill inset 36px from the top, 79.3px radius, 5% grey fill over a 17%
 * white hairline.
 */
@Component({
  imports: [Bars, ChevronDown, DrawerModule, PopoverModule, RouterLink],
  selector: 'app-public-navbar',
  templateUrl: './public-navbar.html',
})
export class PublicNavbar {
  protected readonly productLinks = PRODUCT_LINKS;
  protected readonly landingUrl = LANDING_SITE_URL;
  protected readonly drawerOpen = signal(false);

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
