import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { AuthService } from '../../core/auth/auth-service';

interface NavLink {
  label: string;
  path: string;
  /** Exact matching for parents whose children have their own entries. */
  exact: boolean;
}

const CREATOR_LINKS: NavLink[] = [
  { label: 'Campaigns', path: '/campaigns', exact: false },
  { label: 'Dashboard', path: '/creator/dashboard', exact: false },
];

const ADMIN_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/admin/dashboard', exact: false },
  { label: 'Campaigns', path: '/admin/campaigns', exact: false },
  { label: 'Clippers', path: '/admin/registrations', exact: false },
];

/**
 * Signed-in shell as a left sidebar: brand mark, role-aware links, and the
 * session actions. Collapses to a top bar + drawer below `lg`.
 *
 * The Figma shows an icon-only rail; we keep the established labeled pattern,
 * which is clearer and already consistent across the creator screens.
 */
@Component({
  imports: [ButtonModule, DrawerModule, RouterLink, RouterLinkActive],
  selector: 'app-side-nav',
  templateUrl: './side-nav.html',
})
export class SideNav {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly isSignedIn = this.auth.isSignedIn;
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly drawerOpen = signal(false);

  protected readonly links = computed(() => (this.isAdmin() ? ADMIN_LINKS : CREATOR_LINKS));
  /** Admins land in their own section rather than public discovery. */
  protected readonly homeLink = computed(() =>
    this.isAdmin() ? '/admin/dashboard' : '/campaigns',
  );

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected signOut(): void {
    this.drawerOpen.set(false);
    this.auth.signOut();
    void this.router.navigate(['/campaigns']);
  }
}
