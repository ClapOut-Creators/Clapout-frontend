import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Home } from '@primeicons/angular/home';
import { ClipperAvatar } from './clipper-avatar';
import { AuthService } from '../../core/auth/auth-service';

/** One breadcrumb: a plain label, or a label that links somewhere. */
export type Crumb = string | { label: string; path: string };

/** The trail's first stop on every signed-in creator page. */
export const DASHBOARD_CRUMB: Crumb = { label: 'Dashboard', path: '/creator/dashboard' };
export const CAMPAIGNS_CRUMB: Crumb = { label: 'Campaigns', path: '/campaigns' };

function crumbLabel(crumb: Crumb): string {
  return typeof crumb === 'string' ? crumb : crumb.label;
}

function crumbPath(crumb: Crumb): string | null {
  return typeof crumb === 'string' ? null : crumb.path;
}

/** `user@host` has no place on a breadcrumb chip; the local part reads fine. */
function emailLocalPart(email: string | undefined): string {
  return email ? email.split('@')[0] : '';
}

/**
 * The page header row every signed-in creator screen starts with (Figma
 * 397:3135 "Frame 261"): a grey breadcrumb pill on the left — a home glyph and
 * the trail, hairline-separated — and the account chip on the right.
 *
 * The markup is the one `creator-dashboard.html` already draws, generalised to
 * a trail of crumbs: every crumb but the last is muted, exactly as the board
 * greys "Dashboard" beside the campaign it drilled into.
 */
@Component({
  imports: [ClipperAvatar, Home, RouterLink],
  selector: 'app-creator-page-header',
  template: `
    <div class="flex items-start justify-between gap-3 pb-5">
      <!--
        The trail is the part that gives way on a narrow screen: a campaign
        title is long, and the board keeps both chips on one row. Only the last
        crumb truncates, so "Dashboard ›" never turns into an ellipsis.
      -->
      <p
        class="m-0 inline-flex min-w-0 items-center gap-2 rounded-[26px] bg-[#F1F1F1] px-2.5 py-1.5 text-[14px] leading-[17px] text-[#464646]"
      >
        <!-- The home glyph is the trail's root: it goes to the dashboard. -->
        <a
          routerLink="/creator/dashboard"
          class="flex shrink-0 items-center text-[#585858] no-underline hover:text-[#171A1C]"
          aria-label="Dashboard"
        >
          <svg data-p-icon="home" [size]="14" aria-hidden="true"></svg>
        </a>
        @for (crumb of crumbs(); track $index) {
          <span class="h-[17px] w-px shrink-0 bg-[#D5D5D5]" aria-hidden="true"></span>
          @if (!$last && pathOf(crumb); as path) {
            <!-- Every crumb before the last is a link back up the trail. -->
            <a
              [routerLink]="path"
              class="co-user-text min-w-0 max-w-[22rem] shrink-0 truncate text-[#A8A8A8] no-underline hover:text-[#464646] hover:underline"
              >{{ labelOf(crumb) }}</a
            >
          } @else {
            <span
              class="co-user-text min-w-0 max-w-[22rem] truncate"
              [class]="$last ? '' : 'shrink-0 text-[#A8A8A8]'"
              [attr.aria-current]="$last ? 'page' : null"
              >{{ labelOf(crumb) }}</span
            >
          }
        }
      </p>

      <p
        class="m-0 inline-flex shrink-0 items-center gap-2 rounded-[26px] bg-[#F1F1F1] py-1.5 pr-1.5 pl-3.5 text-[14px] leading-[17px] text-[#464646] max-lg:hidden"
      >
        <span class="max-w-[16rem] truncate">{{ displayName() }}</span>
        <app-clipper-avatar
          [seed]="user()?.id ?? ''"
          [name]="displayName()"
          [size]="30"
          [ring]="true"
        />
      </p>
    </div>
  `,
})
export class CreatorPageHeader {
  /**
   * Breadcrumb trail after the home glyph, e.g. `[DASHBOARD_CRUMB, 'E-wale
   * clipping']`. A crumb with a `path` renders as a link unless it is the
   * last (current) one.
   */
  readonly crumbs = input<readonly Crumb[]>([]);

  protected labelOf(crumb: Crumb): string {
    return crumbLabel(crumb);
  }

  protected pathOf(crumb: Crumb): string | null {
    return crumbPath(crumb);
  }

  private readonly auth = inject(AuthService);
  protected readonly user = this.auth.user;

  protected readonly displayName = computed(() => {
    const user = this.auth.user();
    return user?.fullName?.trim() || emailLocalPart(user?.email) || 'Your account';
  });

  protected readonly initials = computed(() => {
    const letters = this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
    return letters || '?';
  });
}
