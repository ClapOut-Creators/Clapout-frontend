import { Component, computed, input } from '@angular/core';
import { Calendar } from '@primeicons/angular/calendar';
import { Crown } from '@primeicons/angular/crown';
import { Eye } from '@primeicons/angular/eye';
import { InfoCircle } from '@primeicons/angular/info-circle';
import { Trophy } from '@primeicons/angular/trophy';
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

export function earnedAmount(verifiedViews: number, cpm: number | null | undefined): number | null {
  if (cpm === null || cpm === undefined || !Number.isFinite(cpm) || cpm <= 0) {
    return null;
  }
  return Math.round((Math.max(0, verifiedViews) / 1000) * cpm * 100) / 100;
}

export function formatEarnings(
  currency: string,
  verifiedViews: number,
  cpm: number | null | undefined,
): string {
  const amount = earnedAmount(verifiedViews, cpm);
  return amount === null ? `${currency}\u2009${NOT_ANNOUNCED}` : formatMoneyExact(currency, amount);
}

export function podiumEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const top = entries.slice(0, 3);
  return [top[1], top[0], top[2]].filter((entry): entry is LeaderboardEntry => !!entry);
}

export function remainingEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries.slice(3);
}

export function podiumAvatarClass(rank: number): string {
  const base = 'rounded-full border-white';
  return rank === 1
    ? `${base} size-20 border-[4px] shadow-[0_0_0_3px_#FFD874] lg:size-28`
    : `${base} size-14 border-[3px] shadow-[0_0_0_2px_#FFD874] lg:size-24`;
}

export function podiumPlacementClass(rank: number): string {
  return rank === 1
    ? 'flex flex-col items-center text-center'
    : 'flex flex-col items-center text-center lg:pb-12';
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
 * verified-view ranking. Loading and error belong to the host; this renders
 * the ranked rows and, when nobody has an approved clip yet, the empty copy.
 */
@Component({
  imports: [Calendar, Crown, Eye, InfoCircle, Trophy],
  selector: 'app-leaderboard-list',
  template: `
    <section aria-labelledby="campaign-leaderboard-heading">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="campaign-leaderboard-heading"
            class="m-0 flex items-center gap-2 text-[20px] leading-[29px] font-semibold text-[#171A1C] lg:text-[23px] lg:leading-[35px]"
          >
            Top earners
            <svg data-p-icon="info-circle" [size]="16" class="text-[#6F6F6F]" aria-hidden="true" />
          </h2>
          <p class="m-0 mt-1 text-[15px] leading-6 text-[#666666] lg:text-[16px]">
            Rankings update from approved clips and verified views.
          </p>
        </div>

        <div class="flex items-center gap-3">
          @if (updatedLabel(); as updated) {
            <span class="text-[14px] text-[#666666] lg:text-[15px]" aria-live="polite"
              >Updated {{ updated }}</span
            >
          }

          <button
            type="button"
            class="inline-flex h-10 cursor-default items-center gap-2 rounded-[14px] border border-[#ECECEC] bg-white px-4 text-[14px] font-medium text-[#2D2D2D]"
            aria-label="Leaderboard period: all time"
          >
            <svg data-p-icon="calendar" [size]="16" class="text-[#6F6F6F]" aria-hidden="true" />
            All time
          </button>
        </div>
      </div>

      @if (leaderboard().entries.length) {
        <div
          class="relative mt-6 overflow-hidden rounded-[20px] bg-[linear-gradient(100deg,#FFF4E8_0%,#FFFFFF_48%,#FFF0F5_100%)] px-4 py-8 lg:rounded-[24px] lg:px-8 lg:py-10"
        >
          <div class="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
            <span
              class="absolute left-[7%] top-[28%] h-1 w-3 rotate-45 rounded-full bg-[#EC612C]"
            ></span>
            <span
              class="absolute left-[14%] top-[45%] h-1 w-2 -rotate-12 rounded-full bg-[#FFC93C]"
            ></span>
            <span
              class="absolute left-[28%] top-[22%] h-1 w-3 -rotate-45 rounded-full bg-[#CE65E8]"
            ></span>
            <span
              class="absolute left-[74%] top-[26%] h-1 w-3 rotate-45 rounded-full bg-[#72D980]"
            ></span>
            <span
              class="absolute right-[9%] top-[35%] h-1 w-3 -rotate-45 rounded-full bg-[#F05252]"
            ></span>
          </div>

          <ol
            class="relative z-10 m-0 grid list-none grid-cols-3 items-end gap-3 px-0 lg:min-h-[205px] lg:gap-8"
            aria-label="Top three earners"
          >
            @for (entry of podium(); track entry.creatorId) {
              <li [class]="podiumPlacementClass(entry.rank)">
                <span
                  class="mb-2 inline-flex h-7 min-w-7 items-center justify-center rounded-[10px] px-2 text-[16px] font-semibold text-white shadow-sm"
                  [class]="rankBadgeClass(entry.rank)"
                >
                  {{ entry.rank }}
                  <span class="sr-only"> rank</span>
                </span>
                <span
                  [class]="podiumAvatarClass(entry.rank)"
                  [style.background-image]="avatarGradient(entry.creatorId)"
                  aria-hidden="true"
                ></span>
                <span
                  class="co-user-text mt-3 max-w-full truncate text-[14px] font-semibold text-[#2B2B2B] lg:text-[18px]"
                  >{{ entryLabel(entry) }}</span
                >
                <span class="mt-1 text-[15px] font-semibold text-[#171A1C] lg:text-[20px]">
                  {{ formatEarnings(currency(), entry.verifiedViews, cpm()) }}
                </span>
                <span
                  class="mt-1 flex items-center gap-1 text-[13px] text-[#666666] lg:text-[15px]"
                >
                  <svg data-p-icon="eye" [size]="15" class="text-[#8E8E93]" aria-hidden="true" />
                  {{ formatViews(entry.verifiedViews) }} views
                </span>
              </li>
            }
          </ol>
        </div>

        @if (rest().length) {
          <ol class="m-0 mt-4 flex list-none flex-col gap-2.5 px-0" aria-label="Remaining earners">
            @for (entry of rest(); track entry.creatorId) {
              <li
                class="grid min-h-[62px] grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border border-[#F0F0F0] bg-white px-4 py-3 lg:min-h-[76px] lg:grid-cols-[3rem_minmax(0,1fr)_auto_auto] lg:gap-5 lg:px-6"
              >
                <span class="text-[16px] font-semibold text-[#171A1C]">{{ entry.rank }}</span>
                <span class="flex min-w-0 items-center gap-3">
                  <span
                    class="size-8 shrink-0 rounded-full border border-[#F2F2F2] lg:size-11"
                    [style.background-image]="avatarGradient(entry.creatorId)"
                    aria-hidden="true"
                  ></span>
                  <span
                    class="co-user-text min-w-0 truncate text-[14px] text-[#454545] lg:text-[18px]"
                    >{{ entryLabel(entry) }}</span
                  >
                </span>
                <span class="text-right text-[15px] font-semibold text-[#171A1C] lg:text-[18px]">
                  {{ formatEarnings(currency(), entry.verifiedViews, cpm()) }}
                </span>
                <span class="hidden items-center gap-2 text-[14px] text-[#666666] lg:flex">
                  <svg data-p-icon="eye" [size]="18" class="text-[#A4A5A9]" aria-hidden="true" />
                  {{ formatViews(entry.verifiedViews) }}
                </span>
              </li>
            }
          </ol>
        }

        @if (needsOwnStandingFooter(leaderboard())) {
          <p class="m-0 mt-4 text-[14px] leading-6 text-[#7B7B7B] lg:text-[16px]">
            You are #{{ leaderboard().me?.rank }} with
            {{ formatEarnings(currency(), leaderboard().me?.verifiedViews ?? 0, cpm()) }} from
            {{ formatViews(leaderboard().me?.verifiedViews ?? 0) }} verified views.
          </p>
        }
      } @else {
        <div
          class="mt-6 rounded-[20px] border border-[#F0F0F0] bg-[linear-gradient(100deg,#FFF4E8,#FFFFFF,#FFF0F5)] p-6 text-center"
        >
          <p class="m-0 text-[18px] font-semibold text-[#171A1C]">No earners yet</p>
          <p class="m-0 mt-2 text-[16px] leading-6 text-[#7B7B7B]">
            Approved clips appear here once verified views start turning into earnings.
          </p>
        </div>
      }

      <aside
        class="mt-6 flex flex-col gap-4 rounded-[18px] bg-[linear-gradient(100deg,#FFF1E2,#FFFFFF,#FFF1E2)] px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8"
        aria-label="How leaderboard rankings work"
      >
        <span class="flex items-start gap-4">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F2A91B] text-white"
            aria-hidden="true"
          >
            <svg data-p-icon="trophy" [size]="24" />
          </span>
          <span>
            <span class="block text-[16px] font-semibold text-[#171A1C] lg:text-[18px]">
              Keep creating amazing clips!
            </span>
            <span class="mt-1 block text-[14px] leading-5 text-[#454545] lg:text-[16px]">
              The more verified views your clips get, the higher your earnings can rise.
            </span>
          </span>
        </span>
        <span class="text-[15px] font-semibold text-[#EC612C] lg:text-[16px]">
          How rankings work →
        </span>
      </aside>
    </section>
  `,
})
export class LeaderboardList {
  readonly leaderboard = input.required<CampaignLeaderboard>();
  readonly currency = input.required<string>();
  readonly cpm = input<number | null>(null);

  protected readonly avatarGradient = avatarGradient;
  protected readonly entryLabel = entryLabel;
  protected readonly formatEarnings = formatEarnings;
  protected readonly formatViews = formatViews;
  protected readonly needsOwnStandingFooter = needsOwnStandingFooter;
  protected readonly podiumAvatarClass = podiumAvatarClass;
  protected readonly podiumPlacementClass = podiumPlacementClass;
  protected readonly rankBadgeClass = rankBadgeClass;
  protected readonly podium = computed(() => podiumEntries(this.leaderboard().entries));
  protected readonly rest = computed(() => remainingEntries(this.leaderboard().entries));

  /**
   * '3h ago' beside the period pill: how long since a view check or an approval
   * last moved the board. Recomputed on every poll, since a new board object is
   * what the host hands back. Hidden entirely while nothing is ranked.
   */
  protected readonly updatedLabel = computed(() => shortElapsed(this.leaderboard().updatedAt));
}
