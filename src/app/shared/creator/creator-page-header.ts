import { Component, computed, inject, input } from '@angular/core';
import { Home } from '@primeicons/angular/home';
import { AuthService } from '../../core/auth/auth-service';

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
  imports: [Home],
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
        <svg
          data-p-icon="home"
          [size]="14"
          class="shrink-0 text-[#585858]"
          aria-hidden="true"
        ></svg>
        @for (crumb of crumbs(); track $index) {
          <span class="h-[17px] w-px shrink-0 bg-[#D5D5D5]" aria-hidden="true"></span>
          <span
            class="co-user-text min-w-0 max-w-[22rem] truncate"
            [class]="$last ? '' : 'shrink-0 text-[#A8A8A8]'"
            [attr.aria-current]="$last ? 'page' : null"
            >{{ crumb }}</span
          >
        }
      </p>

      <p
        class="m-0 inline-flex shrink-0 items-center gap-2 rounded-[26px] bg-[#F1F1F1] py-1.5 pr-1.5 pl-3.5 text-[14px] leading-[17px] text-[#464646]"
      >
        <span class="max-w-[16rem] truncate">{{ displayName() }}</span>
        <span
          class="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-[#EC612C] bg-[#BABABA] text-[12px] font-semibold text-white"
          aria-hidden="true"
          >{{ initials() }}</span
        >
      </p>
    </div>
  `,
})
export class CreatorPageHeader {
  /** Breadcrumb trail after the home glyph, e.g. `['Dashboard', 'E-wale clipping']`. */
  readonly crumbs = input<readonly string[]>([]);

  private readonly auth = inject(AuthService);

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
