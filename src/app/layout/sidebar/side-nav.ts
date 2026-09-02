import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Clipboard } from '@primeicons/angular/clipboard';
import { Briefcase } from '@primeicons/angular/briefcase';
import { Cog } from '@primeicons/angular/cog';
import { Compass } from '@primeicons/angular/compass';
import { Home } from '@primeicons/angular/home';
import { Shop } from '@primeicons/angular/shop';
import { Sidebar } from '@primeicons/angular/sidebar';
import { SignOut } from '@primeicons/angular/sign-out';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../core/auth/auth-service';

interface NavLink {
  label: string;
  path: string;
  /** Exact matching for parents whose children have their own entries. */
  exact: boolean;
  icon: 'briefcase' | 'clipboard' | 'compass' | 'home' | 'shop';
}

// Figma (clipper dashboard rail): home first, then discovery.
const CREATOR_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/creator/dashboard', exact: false, icon: 'home' },
  { label: 'Campaigns', path: '/campaigns', exact: false, icon: 'compass' },
];

// Order and glyphs follow the Figma rail: home → brands (shop) → campaigns
// (clipboard); registrations is our addition and keeps the compass glyph.
const ADMIN_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/admin/dashboard', exact: false, icon: 'home' },
  { label: 'Brands', path: '/admin/brands', exact: false, icon: 'shop' },
  { label: 'Campaigns', path: '/admin/campaigns', exact: false, icon: 'clipboard' },
  { label: 'Partnerships', path: '/admin/partnerships', exact: false, icon: 'briefcase' },
  { label: 'Registrations', path: '/admin/registrations', exact: false, icon: 'compass' },
];

/**
 * Signed-in shell as a left sidebar: brand mark, role-aware links, and the
 * session actions. The desktop shell uses the compact icon rail from the
 * dashboard reference, while mobile keeps a labelled drawer for scanability.
 */
@Component({
  imports: [
    ButtonModule,
    Briefcase,
    Clipboard,
    Cog,
    Compass,
    DrawerModule,
    Home,
    MenuModule,
    RouterLink,
    RouterLinkActive,
    Shop,
    Sidebar,
    SignOut,
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
  protected readonly accountMenuItems = computed<MenuItem[]>(() => [
    {
      label: 'Sign out',
      command: () => this.signOut(),
    },
  ]);
  /** Admins land in their own section rather than public discovery. */
  protected readonly homeLink = computed(() =>
    this.isAdmin() ? '/admin/dashboard' : '/campaigns',
  );

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
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
