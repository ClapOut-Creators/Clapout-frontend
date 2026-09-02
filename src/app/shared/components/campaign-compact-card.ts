import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Clock } from '@primeicons/angular/clock';
import { Facebook } from '@primeicons/angular/facebook';
import { Instagram } from '@primeicons/angular/instagram';
import { Tiktok } from '@primeicons/angular/tiktok';
import { Twitter } from '@primeicons/angular/twitter';
import { Wallet } from '@primeicons/angular/wallet';
import { Youtube } from '@primeicons/angular/youtube';
import { CampaignStatus, PublicCampaign } from '../../features/campaigns/models/campaign';
import {
  budgetPercent,
  campaignStatusLabel,
  campaignStatusTone,
  campaignTimeLabel,
  formatMoneyExact,
  hasBudget,
  platformLabel,
  TagTone,
} from '../utils/campaign-format';
import { ShareCampaignButton } from '../../features/campaigns/components/share-campaign-button';
import { BrandLogoTile } from './brand-logo-tile';

/**
 * The Figma status pills, keyed by the tone `campaignStatusTone` already
 * assigns so the pill palette never drifts from the `p-tag` severities used
 * elsewhere. Every colour is lifted from the admin design system.
 */
const STATUS_PILL_CLASSES: Record<TagTone, string> = {
  success: 'bg-[#C8FFC8] text-[#009100]',
  warn: 'bg-[#FFDAC0] text-[#F5622A]',
  danger: 'bg-[#FFDBDB] text-[#910000]',
  secondary: 'bg-[#FFDBDB] text-[#910000]',
  contrast: 'bg-[#ECECEC] text-[#525252]',
  info: 'bg-[#E1ECFF] text-[#015AF4]',
};

/** Shared by the card grid and the campaign detail header. */
export function campaignStatusPillClass(status: CampaignStatus): string {
  return STATUS_PILL_CLASSES[campaignStatusTone(status)] ?? STATUS_PILL_CLASSES.contrast;
}

/**
 * "Campaign Card — Compact": the tile the admin campaign grid is built from.
 *
 * One link per campaign carrying the brand identity, lifecycle status, the
 * countdown, the platforms it runs on and the money summary. The budget meter
 * is only drawn once a budget exists — an unannounced budget says so in words
 * rather than rendering a 0% bar that reads as "nothing spent".
 */
@Component({
  imports: [
    BrandLogoTile,
    Clock,
    Facebook,
    Instagram,
    RouterLink,
    ShareCampaignButton,
    Tiktok,
    Twitter,
    Wallet,
    Youtube,
  ],
  selector: 'app-campaign-compact-card',
  template: `
    <!-- The card is one big link, but it also carries a Share button, and a button
         may not live inside an anchor. The anchor is therefore a transparent
         overlay stretched across the card, and the Share control lifts itself
         above it. -->
    <div
      class="relative flex h-full flex-col rounded-[26.27px] border border-[#DDDDDD] bg-[#F8F8F8] px-[17px] pb-[22px] pt-[22px] transition-colors hover:border-[#CDCDCD] hover:bg-[#F4F4F4]"
    >
      <a
        class="absolute inset-0 rounded-[26.27px] no-underline"
        [routerLink]="[routerLinkBase(), campaign().slug]"
        [attr.aria-label]="'Open ' + (campaign().title || campaign().brand.name)"
      ></a>

      <div class="flex items-start justify-between gap-3">
        <app-brand-logo-tile
          [name]="campaign().brand.name"
          [logoUrl]="campaign().brand.logoUrl"
          [logoBg]="campaign().brand.logoBg"
          [logoFit]="campaign().brand.logoFit"
          sizeClass="h-[66px] w-[96px] sm:w-[120px] xl:w-[152px] !rounded-[13.13px]"
        />

        <span class="flex shrink-0 flex-col items-end gap-2.5">
          <span
            class="inline-flex items-center rounded-full px-[14.45px] py-[5.25px] text-[13.13px] font-medium leading-[17.07px]"
            [class]="statusPillClass()"
            >{{ statusLabel() }}</span
          >
          <span class="inline-flex items-center gap-[5.25px] text-[14.45px] text-[#7B7B7B]">
            <svg data-p-icon="clock" [size]="16" class="text-[#616161]" aria-hidden="true"></svg>
            <span>{{ daysLeft() }}</span>
          </span>
        </span>
      </div>

      <h3 class="mt-3 truncate text-[24px] font-semibold leading-tight text-[#151515]">
        {{ campaign().brand.name }}
      </h3>

      <!-- Drafts have no public page, so there is nothing to share yet. -->
      @if (campaign().status !== 'DRAFT') {
        <app-share-campaign-button
          class="relative z-[1] mt-2.5 self-start"
          variant="text"
          [slug]="campaign().slug"
          [title]="campaign().title"
          [brandName]="campaign().brand.name"
        />
      }

      <p class="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-[14.45px] text-[#666666]">
        <span>Platform</span>
        <span class="flex items-center gap-3 text-[#151515]">
          @for (platform of campaign().platforms; track platform) {
            <span class="inline-flex items-center">
              @switch (platform) {
                @case ('tiktok') {
                  <svg data-p-icon="tiktok" [size]="15" aria-hidden="true"></svg>
                }
                @case ('facebook') {
                  <svg data-p-icon="facebook" [size]="15" aria-hidden="true"></svg>
                }
                @case ('instagram') {
                  <svg data-p-icon="instagram" [size]="15" aria-hidden="true"></svg>
                }
                @case ('youtube') {
                  <svg data-p-icon="youtube" [size]="15" aria-hidden="true"></svg>
                }
                @default {
                  <svg data-p-icon="twitter" [size]="15" aria-hidden="true"></svg>
                }
              }
              <span class="sr-only">{{ platformLabel(platform) }}</span>
            </span>
          } @empty {
            <span class="text-[#7B7B7B]">Not specified</span>
          }
        </span>
      </p>

      <div class="mt-auto pt-6">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex items-center gap-[7px] text-[14.45px] text-[#666666]">
            <svg data-p-icon="wallet" [size]="16" class="text-[#616161]" aria-hidden="true"></svg>
            <span>Paid Out</span>
          </span>
          <span class="text-[14.45px] text-[#7B7B7B]">CPM</span>
        </div>

        <div class="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span class="text-[20px] font-semibold text-[#151515]">
            {{ paidOut() }}
            <span class="text-[11.82px] font-medium text-[#5E5E5E]">/{{ budgetTotal() }}</span>
          </span>
          <span class="text-[20px] font-semibold text-[#151515]">
            {{ cpm() }}
            <span class="text-[11.82px] font-medium text-[#5E5E5E]">/ 1k views</span>
          </span>
        </div>

        @if (hasBudget(campaign().budgetTotal)) {
          <div class="mt-3.5 h-[5px] w-full overflow-hidden rounded-full bg-[#DFDFDF]">
            <div
              class="h-full rounded-full bg-gradient-to-r from-[#EC612C] to-[#FFC93C]"
              [style.width.%]="spentPercent()"
            ></div>
          </div>
        } @else {
          <p class="mt-3.5 text-[11.82px] font-medium text-[#5E5E5E]">Budget not announced yet</p>
        }
      </div>
    </div>
  `,
})
export class CampaignCompactCard {
  readonly campaign = input.required<PublicCampaign>();
  /** Lets the same card link into a brand-scoped route without a second component. */
  readonly routerLinkBase = input<string>('/admin/campaigns');

  protected readonly hasBudget = hasBudget;
  protected readonly platformLabel = platformLabel;

  protected readonly statusLabel = computed(() => campaignStatusLabel(this.campaign().status));
  protected readonly statusPillClass = computed(() =>
    campaignStatusPillClass(this.campaign().status),
  );
  // Only ACTIVE/UPCOMING campaigns count down; a draft has no schedule and a
  // closed one has ended.
  protected readonly daysLeft = computed(() => campaignTimeLabel(this.campaign()));

  protected readonly paidOut = computed(() =>
    formatMoneyExact(this.campaign().currency, this.campaign().budgetSpent),
  );
  protected readonly budgetTotal = computed(() =>
    formatMoneyExact(this.campaign().currency, this.campaign().budgetTotal),
  );
  protected readonly cpm = computed(() =>
    formatMoneyExact(this.campaign().currency, this.campaign().cpm),
  );
  protected readonly spentPercent = computed(() =>
    budgetPercent(this.campaign().budgetSpent, this.campaign().budgetTotal),
  );
}
