import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AuthService } from './core/auth/auth-service';
import { SideNav } from './shared/layout/side-nav';
import { TopNav } from './shared/layout/top-nav';

@Component({
  imports: [ConfirmDialogModule, RouterOutlet, ToastModule, SideNav, TopNav],
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
  /** Side nav is a signed-in (dashboard) affordance; anonymous visitors get the top bar. */
  protected readonly showSideNav = computed(() => !this.isAuthRoute() && this.auth.isSignedIn());
  protected readonly showTopNav = computed(() => !this.isAuthRoute() && !this.auth.isSignedIn());

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }
}
