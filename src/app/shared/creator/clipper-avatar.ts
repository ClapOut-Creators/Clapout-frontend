import { Component, computed, input, signal } from '@angular/core';
import { initials } from '../admin/clipper-format';

/**
 * DiceBear's "avataaars-neutral" style, served from their HTTP API and seeded
 * with the clipper's user id. The seed decides every feature, so each clipper
 * gets one avatar that is theirs from sign-up on — including everyone who
 * registered before this existed — with nothing stored on our side.
 * Free for personal and commercial use (https://www.dicebear.com/styles/avataaars-neutral/).
 */
export const AVATAR_API = 'https://api.dicebear.com/9.x/avataaars-neutral/svg';

export function clipperAvatarUrl(seed: string, size: number): string {
  const params = new URLSearchParams({ seed, radius: '50', size: String(size * 2) });
  return `${AVATAR_API}?${params.toString()}`;
}

/**
 * A clipper's round avatar. Falls back to the initials chip the app drew before
 * if the image cannot load (offline, blocked, or an API hiccup).
 */
@Component({
  selector: 'app-clipper-avatar',
  host: { class: 'inline-flex shrink-0', '[class.h-full]': 'fluid()', '[class.w-full]': 'fluid()' },
  template: `
    @if (failed()) {
      <span
        class="flex items-center justify-center rounded-full bg-gradient-to-br from-[#FFC93C] to-[#EC612C] font-semibold text-white"
        [class]="fluid() ? 'h-full w-full' : ''"
        [style.width.px]="fluid() ? null : size()"
        [style.height.px]="fluid() ? null : size()"
        [style.font-size.px]="fontSize()"
        aria-hidden="true"
        >{{ letters() }}</span
      >
    } @else {
      <img
        [src]="url()"
        [width]="size()"
        [height]="size()"
        [style.width.px]="fluid() ? null : size()"
        [style.height.px]="fluid() ? null : size()"
        class="rounded-full bg-[#F1F1F1] object-cover select-none"
        [class]="(ring() ? 'border border-[#EC612C] ' : '') + (fluid() ? 'h-full w-full' : '')"
        alt=""
        loading="lazy"
        decoding="async"
        draggable="false"
        (error)="failed.set(true)"
      />
    }
  `,
})
export class ClipperAvatar {
  /** What the avatar is generated from — the clipper's user id. */
  readonly seed = input.required<string>();
  /** For the initials fallback only. */
  readonly name = input('');
  readonly size = input(32);
  /** The orange hairline the header chip draws around its avatar. */
  readonly ring = input(false);
  /**
   * Fill the host instead of fixing the pixel size, for wrappers sized by
   * breakpoint (the leaderboard's 30px / 44px circle). `size` then only sets
   * the resolution requested.
   */
  readonly fluid = input(false);

  protected readonly failed = signal(false);
  protected readonly url = computed(() => clipperAvatarUrl(this.seed(), this.size()));
  protected readonly letters = computed(() => initials(this.name()));
  protected readonly fontSize = computed(() => Math.max(10, Math.round(this.size() * 0.38)));
}
