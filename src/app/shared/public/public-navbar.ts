import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Bars } from '@primeicons/angular/bars';
import { ChevronDown } from '@primeicons/angular/chevron-down';
import { Times } from '@primeicons/angular/times';
import { Whatsapp } from '@primeicons/angular/whatsapp';
import { ThemeService } from '../../core/theme/theme-service';
import { COMMUNITY_URL } from '../creator/onboarding-stepper';
import { LANDING_CONTACT_URL, LANDING_SITE_URL, PRODUCT_LINKS } from './public-links';

/**
 * The landing site's pill button, as `src/components/ui/Button.tsx` builds it:
 * 58px radius, Poppins medium, a lift on hover. Two variants are used here.
 */
const BUTTON_BASE =
  'inline-flex cursor-pointer items-center justify-center rounded-[58px] border font-medium no-underline transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]';

/**
 * The landing site's floating pill navbar, replicated for anonymous visitors
 * on the public pages so the marketing site and the campaign pages read as
 * one site. Every destination that is not this app's own campaign list or
 * auth pages is on clapoutcreators.com.
 */
@Component({
  imports: [Bars, ChevronDown, NgTemplateOutlet, RouterLink, RouterLinkActive, Times, Whatsapp],
  selector: 'app-public-navbar',
  host: { '(document:keydown.escape)': 'onEscape()' },
  templateUrl: './public-navbar.html',
})
export class PublicNavbar {
  protected readonly productLinks = PRODUCT_LINKS;
  protected readonly landingUrl = LANDING_SITE_URL;
  protected readonly contactUrl = LANDING_CONTACT_URL;
  protected readonly communityUrl = COMMUNITY_URL;
  protected readonly communityPoints = [
    'Start creating clips immediately',
    'Earn money from your content',
  ];

  protected readonly outlineButtonClass = `${BUTTON_BASE} border-[#CFCFCF] bg-transparent text-[#111111] hover:bg-black/5 active:bg-black/10 dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:active:bg-white/15`;
  protected readonly orangeButtonClass = `${BUTTON_BASE} border-[#CFCFCF] bg-[#EC612C] text-white hover:bg-[#d4551f] active:bg-[#bf4c1c] dark:border-white/20`;

  /** Light/dark, shared with clapoutcreators.com through a cookie. */
  protected readonly theme = inject(ThemeService);

  protected readonly mobileOpen = signal(false);
  protected readonly mobileProductOpen = signal(false);
  protected readonly communityOpen = signal(false);

  /** In-app routes go through the router; everything else is the marketing site. */
  protected isInternal(href: string | null): href is string {
    return !!href && href.startsWith('/');
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
    this.mobileProductOpen.set(false);
  }

  protected onEscape(): void {
    this.communityOpen.set(false);
    this.closeMobile();
  }
}
