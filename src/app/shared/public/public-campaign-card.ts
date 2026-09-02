import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Facebook } from '@primeicons/angular/facebook';
import { Instagram } from '@primeicons/angular/instagram';
import { Tiktok } from '@primeicons/angular/tiktok';
import { Twitter } from '@primeicons/angular/twitter';
import { User } from '@primeicons/angular/user';
import { Youtube } from '@primeicons/angular/youtube';
import { PublicCampaign } from '../../core/models/campaign';
import {
  budgetPercent,
  formatMoneyExact,
  hasBudget,
  NOT_ANNOUNCED,
  platformLabel,
} from '../utils/campaign-format';
import { BrandLogoTile } from '../components/brand-logo-tile';

/** Largest unit first so the first match wins. */
const MONEY_UNITS: readonly (readonly [number, string])[] = [
  [1_000_000_000, 'B'],
  [1_000_000, 'M'],
  [1_000, 'k'],
];

/**
 * The card's compact money: '₵5k', '₵1.5M', '₵950'. One decimal is kept only
 * while the scaled value is below ten, so '₵5k' never becomes '₵5.0k'.
 * Unannounced amounts render as the shared em dash rather than '₵0'.
 */
export function abbreviateMoney(currency: string, amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return NOT_ANNOUNCED;
  }
  const sign = amount < 0 ? '-' : '';
  const value = Math.abs(amount);
  for (const [unit, suffix] of MONEY_UNITS) {
    if (value >= unit) {
      const scaled = value / unit;
      const rounded = scaled < 10 ? Math.round(scaled * 10) / 10 : Math.round(scaled);
      return `${sign}${currency}${rounded}${suffix}`;
    }
  }
  return `${sign}${currency}${Math.round(value * 100) / 100}`;
}

/**
 * '26d ago' — how long ago a campaign was last touched. Anything under a day
 * degrades to hours and then minutes so a freshly published campaign does not
 * read as '0d ago'.
 */
export function elapsedLabel(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) {
    return NOT_ANNOUNCED;
  }
  const updated = new Date(iso).getTime();
  if (Number.isNaN(updated)) {
    return NOT_ANNOUNCED;
  }
  const minutes = Math.floor(Math.max(0, now - updated) / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

/**
 * "Campaign Card — Compact" as it appears on the public campaigns list
 * (Figma 344:1182 desktop / 344:1295 mobile): a banner, the brand chip with
 * how long ago the campaign was updated, the platforms it runs on, the title,
 * the spent/total money line, the participants and CPM pills, and the budget
 * meter.
 *
 * The design shows a verified tick beside every brand. `PublicCampaign` has no
 * verification flag, so the tick is decorative for now and must move behind a
 * real `brand.verified` field once the backend publishes one.
 */
@Component({
  imports: [BrandLogoTile, Facebook, Instagram, RouterLink, Tiktok, Twitter, User, Youtube],
  selector: 'app-public-campaign-card',
  styles: `
    /* The design sets the money and pill numerals in Poppins, the same face the
       global stylesheet gives headings. */
    .co-display {
      font-family: var(--clapout-font-heading);
    }
  `,
  template: `
    <a
      [routerLink]="['/campaigns', campaign().slug]"
      class="flex h-full w-full flex-col rounded-[15.5px] border border-[#E5E5E8] bg-white pb-[9.7px] pl-[3.9px] pr-[3.9px] pt-[3.2px] no-underline shadow-[0_2px_14px_rgba(15,15,18,0.06)] transition-shadow hover:shadow-[0_6px_20px_rgba(15,15,18,0.12)] xl:rounded-[14.7px]"
    >
      <span
        class="block aspect-[350/192] w-full overflow-hidden rounded-[16.5px] bg-[#DDDDDD] xl:rounded-[15.6px]"
      >
        @if (campaign().bannerUrl; as bannerUrl) {
          <img [src]="bannerUrl" alt="" class="h-full w-full object-cover" loading="lazy" />
        } @else {
          <span
            class="flex h-full w-full items-center justify-center px-5 text-center"
            [style.background-color]="campaign().brand.logoBg"
          >
            <span
              class="co-display co-user-text text-[18px] font-semibold leading-tight text-white"
            >
              {{ campaign().brand.name }}
            </span>
          </span>
        }
      </span>

      <div class="mt-[14.2px] flex items-center gap-3 px-[14px] xl:mt-[13.4px]">
        <div class="flex min-w-0 flex-1 items-center gap-[13.6px] xl:gap-[12.8px]">
          <div class="flex min-w-0 items-center gap-[7.7px] xl:gap-[7.3px]">
            <app-brand-logo-tile
              [name]="campaign().brand.name"
              [logoUrl]="campaign().brand.logoUrl"
              [logoBg]="campaign().brand.logoBg"
              [logoFit]="campaign().brand.logoFit"
              sizeClass="h-[27px] w-[27px] xl:h-[26px] xl:w-[26px]"
            />
            <span class="truncate text-[14.9px] font-medium text-[#5C5C61] xl:text-[14px]">
              {{ campaign().brand.name }}
            </span>
            <svg
              class="h-[17px] w-[17px] shrink-0 xl:h-4 xl:w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12z"
                fill="#FFC93C"
              />
              <path
                d="M10.09 16.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"
                fill="#1B1B1B"
              />
            </svg>
          </div>
          <span class="shrink-0 text-[14.9px] text-[#8C8C94] xl:text-[14px]">
            <span class="sr-only">{{ metaLabel() ? metaLabelPrefix() : 'Updated' }}</span>
            {{ metaLabel() ?? updatedLabel() }}
          </span>
        </div>

        @if (campaign().platforms.length) {
          <div class="flex shrink-0 items-center gap-[6px] xl:gap-[5.7px]">
            @for (platform of campaign().platforms; track platform) {
              <span
                class="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#E5E5E8] bg-white text-[#0F0F12] xl:h-[21px] xl:w-[21px]"
              >
                @switch (platform) {
                  @case ('tiktok') {
                    <svg data-p-icon="tiktok" [size]="11" aria-hidden="true"></svg>
                  }
                  @case ('facebook') {
                    <svg data-p-icon="facebook" [size]="11" aria-hidden="true"></svg>
                  }
                  @case ('instagram') {
                    <svg data-p-icon="instagram" [size]="11" aria-hidden="true"></svg>
                  }
                  @case ('youtube') {
                    <svg data-p-icon="youtube" [size]="11" aria-hidden="true"></svg>
                  }
                  @default {
                    <svg data-p-icon="twitter" [size]="11" aria-hidden="true"></svg>
                  }
                }
                <span class="sr-only">{{ platformLabel(platform) }}</span>
              </span>
            }
          </div>
        }
      </div>

      <h3
        class="co-user-text mt-[6.2px] line-clamp-2 px-[14px] text-[21.8px] font-semibold leading-[27.8px] text-[#0F0F12] xl:mt-[5.9px] xl:text-[20.6px] xl:leading-[26.2px]"
      >
        {{ campaign().title }}
      </h3>

      <div
        class="mt-[6.2px] flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-[14px] xl:mt-[5.9px]"
      >
        <p class="co-display m-0 flex items-baseline gap-[4.5px]">
          <span class="sr-only">Paid out</span>
          <span class="text-[17.1px] font-medium text-[#0F0F12] xl:text-[16.2px]">
            {{ spentLabel() }}
          </span>
          <span class="text-[14px] font-medium text-[#737378] xl:text-[13.2px]">
            /{{ totalLabel() }}
          </span>
        </p>

        <div class="flex shrink-0 items-center gap-[11px] xl:gap-[10.4px]">
          <span
            class="co-display inline-flex items-center gap-[4.5px] rounded-full border border-[#E5E5E8] bg-white px-[7.7px] py-[3.2px] text-[14px] font-medium text-[#0F0F12] xl:text-[13.2px]"
          >
            <svg data-p-icon="user" [size]="14" aria-hidden="true"></svg>
            <span aria-hidden="true">{{ participantsLabel() }}</span>
            <span class="sr-only">{{ participantsDescription() }}</span>
          </span>

          <span
            class="inline-flex items-center gap-[4.5px] rounded-full border border-[#E5E5E8] bg-white px-[7.7px] py-[3.2px]"
          >
            <span
              class="flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FC5404] to-[#F27002] text-[8px] font-semibold leading-none text-white"
              aria-hidden="true"
              >{{ campaign().currency }}</span
            >
            <span class="sr-only">CPM</span>
            <span
              class="bg-gradient-to-r from-[#FC5404] to-[#F27002] bg-clip-text text-[14px] font-medium text-transparent xl:text-[13.2px]"
              >{{ cpmLabel() }}</span
            >
          </span>
        </div>
      </div>

      @if (hasBudget(campaign().budgetTotal)) {
        <div class="mt-auto px-[14px] pt-[16.4px] xl:pt-[15.5px]">
          <div class="h-[5px] w-full overflow-hidden rounded-full bg-[#EBEBED]" aria-hidden="true">
            <div class="h-full rounded-full bg-[#17171A]" [style.width.%]="spentPercent()"></div>
          </div>
        </div>
      }
    </a>
  `,
})
export class PublicCampaignCard {
  readonly campaign = input.required<PublicCampaign>();
  /**
   * Replaces the card's "Updated 26d ago" stamp. The clipper dashboard puts the
   * date they applied in that slot, which is the timestamp that matters on
   * their own dashboard, and keeps the card's geometry untouched.
   */
  readonly metaLabel = input<string | null>(null);
  /** Screen-reader prefix for `metaLabel`. */
  readonly metaLabelPrefix = input<string>('Updated');

  protected readonly hasBudget = hasBudget;
  protected readonly platformLabel = platformLabel;

  protected readonly updatedLabel = computed(() => elapsedLabel(this.campaign().updatedAt));
  protected readonly spentLabel = computed(() =>
    abbreviateMoney(this.campaign().currency, this.campaign().budgetSpent),
  );
  protected readonly totalLabel = computed(() =>
    abbreviateMoney(this.campaign().currency, this.campaign().budgetTotal),
  );
  protected readonly cpmLabel = computed(
    () => `${formatMoneyExact(this.campaign().currency, this.campaign().cpm)}/1k`,
  );
  protected readonly spentPercent = computed(() =>
    budgetPercent(this.campaign().budgetSpent, this.campaign().budgetTotal),
  );

  /**
   * `registrationCount` is being added to the public contract; until every
   * environment serves it the pill degrades to the shared em dash rather than
   * claiming zero registrations.
   */
  protected readonly participantsLabel = computed(() => {
    const count = this.campaign().registrationCount;
    return count === null || count === undefined ? NOT_ANNOUNCED : count.toLocaleString('en-GB');
  });

  protected readonly participantsDescription = computed(() => {
    const count = this.campaign().registrationCount;
    return count === null || count === undefined
      ? 'Registered clippers not reported'
      : `${count.toLocaleString('en-GB')} registered clippers`;
  });
}
