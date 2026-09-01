import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { AuthService } from '../../core/auth/auth-service';

/**
 * Minimal public shell as a left sidebar: brand mark, primary links, and the
 * session actions. Collapses to a top bar + drawer below `lg`. The full
 * role-aware Studio shell belongs to the blueprint's later phases.
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
  protected readonly drawerOpen = signal(false);

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected signOut(): void {
    this.drawerOpen.set(false);
    this.auth.signOut();
    void this.router.navigate(['/campaigns']);
  }
}
