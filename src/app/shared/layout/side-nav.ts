import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Compass } from '@primeicons/angular/compass';
import { Home } from '@primeicons/angular/home';
import { Inbox } from '@primeicons/angular/inbox';
import { Sidebar } from '@primeicons/angular/sidebar';
import { SignOut } from '@primeicons/angular/sign-out';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../core/auth/auth-service';
import { SolarIcon } from '../icons/solar-icon';

interface NavLink {
  label: string;
  path: string;
  /** Exact matching for parents whose children have their own entries. */
  exact: boolean;
  icon: 'clipboard' | 'compass' | 'home' | 'inbox' | 'shop' | 'video';
}

// Figma (clipper dashboard rail): home, then the Solar campaign and video glyphs.
const CREATOR_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/creator/dashboard', exact: false, icon: 'home' },
  { label: 'Campaigns', path: '/campaigns', exact: false, icon: 'clipboard' },
  { label: 'Submissions', path: '/creator/submissions', exact: false, icon: 'video' },
];

/** One slot of the phone tab bar; `action` is the raised orange circle. */
interface MobileTab {
  label: string;
  path: string;
  icon: 'home' | 'planet' | 'library';
  action: boolean;
}

/**
 * The three destinations a clipper has, left to right. Campaigns sits in the
 * middle as the raised action circle; the videos and wallet slots the Figma
 * board shows are not built and are not drawn.
 */
const CREATOR_MOBILE_TABS: MobileTab[] = [
  { label: 'Dashboard', path: '/creator/dashboard', icon: 'home', action: false },
  { label: 'Campaigns', path: '/campaigns', icon: 'planet', action: true },
  { label: 'Submissions', path: '/creator/submissions', icon: 'library', action: false },
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
    Compass,
    DrawerModule,
    Home,
    Inbox,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    Sidebar,
    SignOut,
    SolarIcon,
    TooltipModule,
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

  /** The phone header chip: the name, or the email's local part for an account without one. */
  protected readonly displayName = computed(() => {
    const user = this.user();
    return user?.fullName?.trim() || user?.email.split('@')[0] || 'Your account';
  });

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

  /** Signing out lands on the sign-in screen, so signing back in is one step away. */
  protected signOut(): void {
    this.drawerOpen.set(false);
    this.userMenuOpen.set(false);
    this.auth.signOut();
    void this.router.navigate(['/auth/sign-in']);
  }
}
