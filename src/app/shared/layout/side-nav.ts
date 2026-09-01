import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Clipboard } from '@primeicons/angular/clipboard';
import { Cog } from '@primeicons/angular/cog';
import { Compass } from '@primeicons/angular/compass';
import { Home } from '@primeicons/angular/home';
import { Shop } from '@primeicons/angular/shop';
import { Sidebar } from '@primeicons/angular/sidebar';
import { SignOut } from '@primeicons/angular/sign-out';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../core/auth/auth-service';

interface NavLink {
  label: string;
  path: string;
  /** Exact matching for parents whose children have their own entries. */
  exact: boolean;
  icon: 'clipboard' | 'compass' | 'home' | 'shop';
}

const CREATOR_LINKS: NavLink[] = [
  { label: 'Campaigns', path: '/campaigns', exact: false, icon: 'compass' },
  { label: 'Dashboard', path: '/creator/dashboard', exact: false, icon: 'home' },
];

const ADMIN_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/admin/dashboard', exact: false, icon: 'home' },
  { label: 'Campaigns', path: '/admin/campaigns', exact: false, icon: 'shop' },
  { label: 'Registrations', path: '/admin/registrations', exact: false, icon: 'clipboard' },
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
