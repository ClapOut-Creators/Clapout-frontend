import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Clipboard } from '@primeicons/angular/clipboard';
import { Cog } from '@primeicons/angular/cog';
import { Compass } from '@primeicons/angular/compass';
import { Home } from '@primeicons/angular/home';
import { Inbox } from '@primeicons/angular/inbox';
import { Shop } from '@primeicons/angular/shop';
import { Sidebar } from '@primeicons/angular/sidebar';
import { SignOut } from '@primeicons/angular/sign-out';
import { Video } from '@primeicons/angular/video';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../core/auth/auth-service';

interface NavLink {
  label: string;
  path: string;
  /** Exact matching for parents whose children have their own entries. */
  exact: boolean;
  icon: 'clipboard' | 'compass' | 'home' | 'inbox' | 'shop' | 'video';
}

// Figma (clipper dashboard rail): home first, then discovery.
const CREATOR_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/creator/dashboard', exact: false, icon: 'home' },
  { label: 'Campaigns', path: '/campaigns', exact: false, icon: 'compass' },
  { label: 'Submissions', path: '/creator/submissions', exact: false, icon: 'video' },
];

/**
 * One slot of the phone tab bar (Figma 366:376 "Frame 274"). `path: null`
 * marks a surface the platform has not built yet — the board still draws it,
 * so the slot is rendered and announced as unavailable rather than dropped.
 */
interface MobileTab {
  label: string;
  path: string | null;
  icon: 'home' | 'planet' | 'video-frame' | 'wallet';
  /**
   * Left offset as a percentage of the board's 402px width (x = 29 / 115 /
   * 263 / 349), so the bar keeps the design's rhythm on any phone.
   */
  left: string;
}

const CREATOR_MOBILE_TABS: MobileTab[] = [
  { label: 'Dashboard', path: '/creator/dashboard', icon: 'home', left: 'left-[7.214%]' },
  { label: 'Campaigns', path: '/campaigns', icon: 'planet', left: 'left-[28.607%]' },
  { label: 'Videos', path: null, icon: 'video-frame', left: 'left-[65.423%]' },
  { label: 'Wallet', path: null, icon: 'wallet', left: 'left-[86.816%]' },
];

// Order and glyphs follow the Figma rail: home → brands (shop) → campaigns
// (clipboard); registrations is our addition and keeps the compass glyph.
const ADMIN_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/admin/dashboard', exact: false, icon: 'home' },
  { label: 'Brands', path: '/admin/brands', exact: false, icon: 'shop' },
  { label: 'Campaigns', path: '/admin/campaigns', exact: false, icon: 'clipboard' },
  { label: 'Registrations', path: '/admin/registrations', exact: false, icon: 'compass' },
  { label: 'Submissions', path: '/admin/submissions', exact: false, icon: 'video' },
  { label: 'Inquiries', path: '/admin/inquiries', exact: false, icon: 'inbox' },
];

/**
 * Signed-in shell as a left sidebar: brand mark, role-aware links, and the
 * session actions. The desktop shell uses the compact icon rail from the
 * dashboard reference, while mobile keeps a labelled drawer for scanability.
 */
@Component({
  imports: [
    ButtonModule,
    Clipboard,
    Cog,
    Compass,
    DrawerModule,
    Home,
    Inbox,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    Shop,
    Sidebar,
    SignOut,
    TooltipModule,
    Video,
  ],
  selector: 'app-side-nav',
  styleUrl: './side-nav.css',
  templateUrl: './side-nav.html',
})
export class SideNav {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly isSignedIn = this.auth.isSignedIn;
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly drawerOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  protected readonly links = computed(() => (this.isAdmin() ? ADMIN_LINKS : CREATOR_LINKS));
  /** The phone tab bar is a clipper affordance; admins keep the drawer only. */
  protected readonly showMobileTabBar = computed(() => this.isSignedIn() && !this.isAdmin());
  protected readonly mobileTabs = CREATOR_MOBILE_TABS;
  /** Admins land in their own section rather than public discovery. */
  protected readonly homeLink = computed(() =>
    this.isAdmin() ? '/admin/dashboard' : '/campaigns',
  );

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected initials(): string {
    const name = this.user()?.fullName.trim();
    if (!name) {
      return 'U';
    }
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected signOut(): void {
    this.drawerOpen.set(false);
    this.userMenuOpen.set(false);
    this.auth.signOut();
    void this.router.navigate(['/campaigns']);
  }
}
