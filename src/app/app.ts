import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AuthService } from './core/auth/auth-service';
import { SideNav } from './layout/sidebar/side-nav';
import { PublicFooter } from './layout/public/public-footer';
import { PublicNavbar } from './layout/public/public-navbar';

@Component({
  imports: [ConfirmDialogModule, PublicFooter, PublicNavbar, RouterOutlet, SideNav, ToastModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = signal(this.router.url);

  /** Auth pages are chromeless — no nav of either kind. */
  protected readonly isAuthRoute = computed(() => this.currentUrl().startsWith('/auth'));
  /** Side nav is a signed-in (dashboard) affordance. */
  protected readonly showSideNav = computed(() => !this.isAuthRoute() && this.auth.isSignedIn());
  /**
   * Anonymous visitors get the landing site's chrome — floating pill navbar and
   * dark footer — so the public campaign pages read as part of clapoutcreators.com
   * rather than the studio. The design has no signed-in variant of these pages,
   * so signed-in users keep the rail.
   */
  protected readonly showPublicChrome = computed(
    () => !this.isAuthRoute() && !this.auth.isSignedIn(),
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }
}
