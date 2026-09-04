import { Component, computed, input } from '@angular/core';
import { Crown } from '@primeicons/angular/crown';
import { Eye } from '@primeicons/angular/eye';
import { CampaignLeaderboard, LeaderboardEntry } from '../../core/models/leaderboard';
import { formatMoneyExact, NOT_ANNOUNCED } from '../../core/util/campaign-format';
import { shortElapsed } from '../../core/util/relative-time';

/**
 * Rank pill fill (Figma "Frame 292" on each row): a warm gradient for the
 * winner, the brand yellow for second, charcoal for third, and a light grey
 * for everyone else. The numeral stays white on all four.
 */
export function rankBadgeClass(rank: number): string {
  if (rank === 1) {
    return 'bg-gradient-to-br from-[#EC612C] to-[#F0913C]';
  }
  if (rank === 2) {
    return 'bg-[#FFC93C]';
  }
  if (rank === 3) {
    return 'bg-[#676767]';
  }
  return 'bg-[#CACACA]';
}

/**
 * A stable two-hue gradient per creator. Clippers have no avatar image, and
 * the board fills the 44px circle with a colourful gradient instead — one that
 * has to survive a reload and a re-rank, so it is derived from the id rather
 * than from the row's position.
 */
export function avatarGradient(creatorId: string): string {
  let hash = 0;
  for (let index = 0; index < creatorId.length; index += 1) {
    hash = (hash * 31 + creatorId.charCodeAt(index)) % 360_000;
  }
  // 137 is coprime with 360, so two ids one character apart still land more
  // than a third of the wheel apart instead of side by side.
  const from = (hash * 137) % 360;
  const to = (from + 80 + ((hash * 53) % 140)) % 360;
  return `linear-gradient(135deg, hsl(${from} 78% 46%) 0%, hsl(${to} 82% 52%) 100%)`;
}

/** The caller's own row is marked in the name, not with a second badge. */
export function entryLabel(entry: Pick<LeaderboardEntry, 'displayName' | 'isMe'>): string {
  return entry.isMe ? `${entry.displayName} (you)` : entry.displayName;
}

/** '8,400' — grouped the way the board prints it. */
export function formatViews(views: number): string {
  return Number.isFinite(views) ? Math.trunc(views).toLocaleString('en-GB') : '0';
}

/**
 * What the ranked views are worth at the campaign's CPM, 2 dp — the same
 * arithmetic the API freezes into each approved clip's payout. Null when the
 * campaign has not announced a CPM, so the row can say so instead of "₵0".
 */
export function earnedAmount(verifiedViews: number, cpm: number | null | undefined): number | null {
  if (cpm === null || cpm === undefined || !Number.isFinite(cpm) || cpm <= 0) {
    return null;
  }
  return Math.round((Math.max(0, verifiedViews) / 1000) * cpm * 100) / 100;
}

/** '₵30.63', or '₵ —' while the CPM is unannounced. */
export function formatEarnings(
  currency: string,
  verifiedViews: number,
  cpm: number | null | undefined,
): string {
  const amount = earnedAmount(verifiedViews, cpm);
  return amount === null ? `${currency}\u2009${NOT_ANNOUNCED}` : formatMoneyExact(currency, amount);
}

/**
 * Is the caller's standing already visible in the listed rows? When it is not
 * — they rank past the top 25 — the board gets a footer line instead.
 */
export function needsOwnStandingFooter(leaderboard: CampaignLeaderboard | null): boolean {
  if (!leaderboard?.me) {
    return false;
  }
  return !leaderboard.entries.some((entry) => entry.isMe);
}

/**
 * "Top earners" (Figma 398:6785 desktop / 398:6940 mobile): the campaign's
 * verified-view ranking as a flat list — rank pill, gradient avatar, name,
 * eye + views, and what those views are worth at the campaign's CPM on the
 * right. Loading and error belong to the host; this renders the ranked rows
 * and, when nobody has an approved clip yet, the empty copy.
 */
@Component({
  imports: [Crown, Eye],
  selector: 'app-leaderboard-list',
  template: `
    <div class="flex items-baseline justify-between gap-3">
      <h2
        class="m-0 text-[18px] leading-[27px] font-semibold text-[#171A1C] lg:text-[23px] lg:leading-[35px]"
      >
        Top earners
      </h2>
      @if (updatedLabel(); as label) {
        <p class="m-0 shrink-0 text-[13px] leading-5 text-[#7B7B7B] lg:text-[14px]">
          Updated {{ label }}
        </p>
      }
    </div>

    @if (leaderboard().entries.length) {
      <ol
        class="m-0 mt-[15px] flex list-none flex-col gap-[11px] rounded-[26px] px-0 py-[11px] lg:mt-[10px] lg:py-[17px]"
      >
        @for (entry of leaderboard().entries; track entry.creatorId) {
          <li
            class="flex min-h-[62px] items-center justify-between gap-3 rounded-[18px] border border-[#F0F0F0] bg-white px-[14px] py-[15px] lg:min-h-[76px] lg:gap-4 lg:px-[26px]"
          >
            <span class="flex min-w-0 flex-1 items-center">
              <span class="w-[43px] shrink-0 lg:w-[127px]">
                <span
                  class="inline-flex h-5 min-w-5 items-center justify-center gap-[7px] rounded-full px-2 text-white lg:h-[35px] lg:min-w-[37px] lg:gap-3 lg:px-[13px]"
                  [class]="rankBadgeClass(entry.rank)"
                >
                  @if (entry.rank === 1) {
                    <svg
                      data-p-icon="crown"
                      [size]="12"
                      class="shrink-0 lg:!size-5"
                      aria-hidden="true"
                    ></svg>
                  }
                  <span
                    class="text-[10.8px] leading-none font-semibold [font-family:var(--clapout-font-heading)] lg:text-[18px]"
                    >{{ entry.rank }}</span
                  >
                  <span class="sr-only">Rank {{ entry.rank }}</span>
                </span>
              </span>

              <span class="flex min-w-0 items-center gap-1.5 lg:gap-[19px]">
                <span
                  class="size-[30px] shrink-0 rounded-full border border-[#F2F2F2] lg:size-11"
                  [style.background-image]="avatarGradient(entry.creatorId)"
                  aria-hidden="true"
                ></span>
                <span
                  class="co-user-text min-w-0 truncate text-[14px] leading-[23.8px] text-[#454545] [font-family:var(--clapout-font-heading)] lg:text-[18px]"
                  >{{ entryLabel(entry) }}</span
                >
              </span>
            </span>

            <span class="flex shrink-0 items-center gap-3 lg:w-[46%] lg:justify-between lg:gap-8">
              <span class="flex items-center gap-[7px] lg:gap-[11px]">
                <svg
                  data-p-icon="eye"
                  [size]="18"
                  class="text-[#A4A5A9] lg:!size-6"
                  aria-hidden="true"
                ></svg>
                <span
                  class="text-[14px] leading-[23.8px] font-medium text-[#454545] [font-family:var(--clapout-font-heading)] lg:text-[18px]"
                  >{{ formatViews(entry.verifiedViews) }}</span
                >
                <span class="sr-only">verified views</span>
              </span>
              <span
                class="min-w-[54px] text-right text-[14px] leading-[23.8px] font-semibold text-[#171A1C] [font-family:var(--clapout-font-heading)] lg:min-w-[72px] lg:text-[18px]"
                >{{ formatEarnings(currency(), entry.verifiedViews, cpm()) }}</span
              >
              <span class="sr-only">earned</span>
            </span>
          </li>
        }
      </ol>

      @if (needsOwnStandingFooter(leaderboard())) {
        <p class="m-0 mt-[11px] text-[14px] leading-6 text-[#7B7B7B] lg:text-[16px]">
          You are #{{ leaderboard().me?.rank }} with
          {{ formatEarnings(currency(), leaderboard().me?.verifiedViews ?? 0, cpm()) }} from
          {{ formatViews(leaderboard().me?.verifiedViews ?? 0) }} verified views.
        </p>
      }
    } @else {
      <p class="m-0 mt-[15px] text-[16px] leading-6 text-[#7B7B7B] lg:mt-[10px] lg:text-[18px]">
        No verified clips yet &mdash; approved clips appear here as the campaign progresses.
      </p>
    }
  `,
})
export class LeaderboardList {
  readonly leaderboard = input.required<CampaignLeaderboard>();
  /** The campaign's currency symbol, e.g. '₵'. */
  readonly currency = input.required<string>();
  /** The campaign's CPM; null while unannounced, in which case rows show '₵ —'. */
  readonly cpm = input<number | null>(null);

  /** '3h ago' from the board's latest approval or view check; null hides it. */
  protected readonly updatedLabel = computed(() => shortElapsed(this.leaderboard().updatedAt));

  protected readonly avatarGradient = avatarGradient;
  protected readonly entryLabel = entryLabel;
  protected readonly formatEarnings = formatEarnings;
  protected readonly formatViews = formatViews;
  protected readonly needsOwnStandingFooter = needsOwnStandingFooter;
  protected readonly rankBadgeClass = rankBadgeClass;
}
