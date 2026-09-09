import { Component, input, output } from '@angular/core';
import { ExternalLink } from '@primeicons/angular/external-link';
import { TagModule } from 'primeng/tag';
import { Submission } from '../../core/models/submission';
import {
  formatDate,
  formatMoneyExact,
  formatViews,
  NOT_ANNOUNCED,
  platformLabel,
  submissionStatusLabel,
  submissionStatusTone,
} from '../../core/util/campaign-format';
import { postUrlLabel } from '../../core/util/platform-url';
import { BrandLogoTile } from '../admin/brand-logo-tile';

/**
 * The clipper's own submissions as compact rows — used under the submit form,
 * on its success state, and on `/creator/submissions`.
 *
 * Drawn in the clipper design language (white card, `rounded-[18.8px]`,
 * `#ECECEC` border, `#2B2B2B` headings, `#808080` body) so a row sits happily
 * beside the dashboard's panels.
 */
@Component({
  imports: [BrandLogoTile, ExternalLink, TagModule],
  selector: 'app-submission-list',
  template: `
    <ul class="m-0 flex list-none flex-col gap-[10px] p-0">
      @for (submission of submissions(); track submission.id) {
        <li
          class="rounded-[18.8px] border border-[#ECECEC] bg-white px-[18px] py-[16px] sm:px-[22px]"
        >
          <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div class="flex min-w-0 items-center gap-[10px]">
              @if (showCampaign()) {
                <app-brand-logo-tile
                  class="shrink-0"
                  [name]="submission.campaign.brandName"
                  [logoUrl]="submission.campaign.brandLogoUrl"
                  [logoBg]="submission.campaign.brandLogoBg"
                  sizeClass="h-[38px] w-[38px]"
                />
              }
              <div class="min-w-0">
                @if (showCampaign()) {
                  <p class="m-0 truncate text-[16px] leading-[22px] font-medium text-[#2B2B2B]">
                    {{ submission.campaign.title || submission.campaign.brandName }}
                  </p>
                }
                <a
                  [href]="submission.postUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex max-w-full items-center gap-1.5 text-[15px] leading-[22px] text-[#EC612C] no-underline hover:underline"
                >
                  <span class="truncate">{{ postLabel(submission.postUrl) }}</span>
                  <svg data-p-icon="external-link" [size]="12" aria-hidden="true"></svg>
                  <span class="sr-only">Open the clip on {{ platformName(submission) }}</span>
                </a>
              </div>
            </div>

            <p-tag
              [value]="statusLabel(submission.status)"
              [severity]="statusTone(submission.status)"
              [rounded]="true"
            />
          </div>

          <dl
            class="m-0 mt-[12px] flex flex-wrap items-baseline gap-x-[18px] gap-y-1.5 text-[14px] leading-5 text-[#808080]"
          >
            <div class="flex items-baseline gap-1.5">
              <dt>Posted</dt>
              <dd class="m-0 text-[#2B2B2B]">{{ postedLabel(submission) }}</dd>
            </div>
            <div class="flex items-baseline gap-1.5">
              <dt>Views</dt>
              <dd class="m-0 text-[#2B2B2B]">{{ viewsLabel(submission) }}</dd>
            </div>
            @if (submission.payoutAmount !== null) {
              <div class="flex items-baseline gap-1.5">
                <dt>Payout</dt>
                <dd class="m-0 font-medium text-[#2B2B2B]">
                  {{ money(submission.campaign.currency, submission.payoutAmount) }}
                </dd>
              </div>
            }
            @if (submission.caption) {
              <div class="flex min-w-0 basis-full items-baseline gap-1.5">
                <dt>Caption</dt>
                <dd class="co-user-text m-0 min-w-0 truncate text-[#2B2B2B]">
                  {{ submission.caption }}
                </dd>
              </div>
            }
          </dl>

          @if (submission.reviewNote) {
            <p
              class="co-user-text m-0 mt-[12px] rounded-[12px] bg-[#F7F7F7] px-[14px] py-[10px] text-[14px] leading-5 text-[#464646]"
            >
              <span class="font-medium text-[#2B2B2B]">Reviewer:</span>&ngsp;{{
                submission.reviewNote
              }}
            </p>
          }

          @if (canWithdraw(submission)) {
            <div class="mt-[12px] flex justify-end">
              <button
                type="button"
                class="inline-flex h-[38px] items-center justify-center rounded-[34px] bg-[#EEEEEE] px-[18px] text-[15px] font-medium text-[#2B2B2B] transition-colors hover:bg-[#E4E4E4] disabled:cursor-not-allowed disabled:opacity-60"
                [disabled]="busyIds().has(submission.id)"
                (click)="withdraw.emit(submission)"
              >
                Withdraw
              </button>
            </div>
          }
        </li>
      }
    </ul>
  `,
})
export class SubmissionList {
  readonly submissions = input.required<Submission[]>();
  /** Adds the brand tile + campaign title; off when every row is one campaign. */
  readonly showCampaign = input(false);
  /** Hides the Withdraw action entirely (e.g. a read-only summary). */
  readonly allowWithdraw = input(true);
  /** Ids with a delete in flight, so only that row's button disables. */
  readonly busyIds = input<ReadonlySet<string>>(new Set<string>());

  readonly withdraw = output<Submission>();

  protected readonly statusLabel = submissionStatusLabel;
  protected readonly statusTone = submissionStatusTone;
  protected readonly money = formatMoneyExact;
  protected readonly postLabel = postUrlLabel;

  protected platformName(submission: Submission): string {
    return platformLabel(submission.platform);
  }

  /** Only an untouched clip can be pulled back (`409 SUBMISSION_LOCKED` after). */
  protected canWithdraw(submission: Submission): boolean {
    return this.allowWithdraw() && submission.status === 'SUBMITTED';
  }

  protected postedLabel(submission: Submission): string {
    return submission.postedAt ? formatDate(submission.postedAt) : formatDate(submission.createdAt);
  }

  /** '12,400 claimed → 11,980 verified', or just the claim while unverified. */
  protected viewsLabel(submission: Submission): string {
    const claimed = submission.claimedViews;
    const verified = submission.verifiedViews;
    if (verified !== null && verified !== undefined) {
      return claimed === null || claimed === undefined
        ? `${formatViews(verified)} verified`
        : `${formatViews(claimed)} claimed → ${formatViews(verified)} verified`;
    }
    return claimed === null || claimed === undefined
      ? NOT_ANNOUNCED
      : `${formatViews(claimed)} claimed`;
  }
}
