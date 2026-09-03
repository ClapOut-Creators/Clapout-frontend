import { NgTemplateOutlet } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { APP_ENVIRONMENT } from '../../core/config/app-environment';
import { SubmissionsRepository } from '../../core/data/submissions-repository';
import { CampaignPlatform, PublicCampaign } from '../../core/models/campaign';
import { Registration } from '../../core/models/registration';
import { Submission } from '../../core/models/submission';
import { Me, PayoutDetails, PayoutMethod } from '../../core/models/user';
import {
  isPlatformPostUrl,
  platformMismatchMessage,
  platformPostPlaceholder,
} from '../../core/util/platform-url';
import {
  isPostUrlSubmissionError,
  submissionErrorMessage,
} from '../../core/util/submission-errors';
import { firstErrorMessage, httpUrlValidator } from '../../shared/forms/form-errors';
import { resizeImageToDataUrl, screenshotFileError } from '../../shared/forms/image-resize';
import {
  OverlaySheet,
  PlatformGlyph,
  SHEET_CHIP_BUTTON_CLASS,
  SHEET_ERROR_CLASS,
  SHEET_FIELD_CLASS,
  SHEET_FIELD_WITH_GLYPH_CLASS,
  SHEET_LABEL_CLASS,
  SHEET_PRIMARY_BUTTON_CLASS,
  SHEET_REQUIRED_CLASS,
  SHEET_RULE_CLASS,
  SHEET_SECONDARY_BUTTON_CLASS,
  SHEET_SUBTITLE_CLASS,
  SHEET_TERMS_CLASS,
  SHEET_TERMS_LINK_CLASS,
} from './overlay-sheet';

/** The four boards, in order; `success` is the fifth. */
export type SubmitStep = 'link' | 'screenshot' | 'payout' | 'success';

/** The tiles the boards draw under every subtitle. */
const SHEET_PLATFORMS: readonly CampaignPlatform[] = ['tiktok', 'instagram', 'youtube'];

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  MTN_MOMO: 'MTN MoMo',
  TELECEL_CASH: 'Telecel Cash',
  AT_MONEY: 'AT Money',
};

const NETWORK_OPTIONS: { label: string; value: PayoutMethod }[] = [
  { label: PAYOUT_METHOD_LABELS.MTN_MOMO, value: 'MTN_MOMO' },
  { label: PAYOUT_METHOD_LABELS.TELECEL_CASH, value: 'TELECEL_CASH' },
  { label: PAYOUT_METHOD_LABELS.AT_MONEY, value: 'AT_MONEY' },
];

const LINK_MESSAGES: Record<string, string> = {
  required: 'Paste the link to the clip you posted.',
  url: 'Enter a full URL, starting with https://',
  platform: 'That link is not on the platform you registered with.',
};

const VIEWS_MESSAGES: Record<string, string> = {
  min: 'Views cannot be negative.',
  integer: 'Enter a whole number of views.',
};

const PAYOUT_MESSAGES: Record<string, Record<string, string>> = {
  method: { required: 'Pick the network that holds the account.' },
  accountNumber: {
    required: 'Add the number the money should be sent to.',
    pattern: 'Use digits only, with spaces or a leading + if you need them.',
    minlength: 'That number looks too short.',
    maxlength: 'That number looks too long.',
  },
  accountName: {
    required: 'Add the name the account is registered in.',
    maxlength: 'Keep the account name under 100 characters.',
  },
};

/** Rejects 1.5 without rejecting an empty field. */
const integerValidator = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return Number.isInteger(value) ? null : { integer: true };
};

/** "024 ••• 1234" — enough of the number to recognise, not enough to reuse. */
export function maskAccountNumber(value: string): string {
  const trimmed = (value ?? '').trim();
  if (trimmed.length <= 7) {
    return trimmed;
  }
  return `${trimmed.slice(0, 3)} ••• ${trimmed.slice(-4)}`;
}

/**
 * The `payout` body for `PATCH /me`, or null when the saved details already say
 * this — the overlay only spends a round trip when something actually changed.
 */
export function payoutPatch(
  saved: PayoutDetails | null,
  next: { method: PayoutMethod | null; accountNumber: string; accountName: string },
): PayoutDetails | null {
  if (!next.method) {
    return null;
  }
  const candidate: PayoutDetails = {
    method: next.method,
    accountNumber: next.accountNumber.trim(),
    accountName: next.accountName.trim(),
  };
  if (!candidate.accountNumber || !candidate.accountName) {
    return null;
  }
  if (
    saved &&
    saved.method === candidate.method &&
    saved.accountNumber === candidate.accountNumber &&
    saved.accountName === candidate.accountName
  ) {
    return null;
  }
  return candidate;
}

/**
 * "Submit post link" — Figma 398:5569 → 402:7789 → 402:8770 → 402:8276 →
 * 398:6048 (mobile 398:5724 → 402:7975 → 402:8964 → 402:8462 → 398:6238).
 *
 * A four-step flow inside one {@link OverlaySheet} over the signed-in campaign
 * page: the post link, the screenshot, the payout details, then the success
 * panel. Boards 3 and 4 are one step in two states — the dashed "+ Add payment
 * method" button expands into the network/account fields in place — because
 * that is what the two frames show.
 *
 * The host owns `visible`; it is opened from `?submit=1` on `/campaigns/:slug`.
 *
 * Payout details are written with `PATCH /me` directly: `AuthService` exposes no
 * profile mutation and holds `user` as a read-only signal, so the overlay keeps
 * its own copy of what it saved (`savedPayout`) for the rest of the session.
 */
@Component({
  imports: [
    InputNumberModule,
    NgTemplateOutlet,
    OverlaySheet,
    PlatformGlyph,
    ReactiveFormsModule,
    RouterLink,
    SelectModule,
  ],
  selector: 'app-submit-post-dialog',
  template: `
    <app-overlay-sheet
      [(visible)]="visible"
      [title]="sheetTitle()"
      [subtitle]="sheetSubtitle()"
      [platforms]="sheetPlatforms()"
      [closeGuard]="closeGuard"
    >
      <!-- ngProjectAs, not a wrapper element: an empty wrapper would still take
           the header's 8px flex gap on the steps that have no rich subtitle. -->
      <ng-container ngProjectAs="[sheetBadge]">
        @if (step() === 'success') {
          <svg
            viewBox="0 0 70 70"
            class="mb-[4px] block size-[60px] lg:mb-[34px] lg:size-[70px]"
            aria-hidden="true"
          >
            <circle cx="35" cy="35" r="35" fill="#20B14C" />
            <path
              d="M20.5 35.8 30.6 45.5 49.8 25.4"
              fill="none"
              stroke="#FFFFFF"
              stroke-width="6.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        }
      </ng-container>

      <ng-container ngProjectAs="[sheetSubtitle]">
        @if (step() === 'link') {
          <p [class]="subtitleClass">
            With this link <strong class="font-semibold">Clapout</strong> can track your views and
            also you get to be paid early
          </p>
        }
        @if (step() === 'success') {
          <p [class]="subtitleClass">
            You have successfully submitted your post link to the campaign. Since you submitted
            early, you can track your position on the
            <strong class="font-semibold">leaderboard</strong> as the campaign progresses.
          </p>
        }
      </ng-container>

      @switch (step()) {
        <!-- ------------------------------------------------ 1. Post link -->
        @case ('link') {
          <!-- The 9px lid is on the 1728 board only; the 402 one starts flush. -->
          <form [formGroup]="form" class="lg:pt-[9px]" (ngSubmit)="continueFromLink()">
            @if (linkErrorMessage(); as message) {
              <p [class]="errorClass" class="mb-[12px]" role="alert">{{ message }}</p>
            }

            <div class="flex flex-col gap-[20px] pb-[30px] lg:pb-[35px] lg:mb-0 mb-[12px]">
              <div class="flex flex-col gap-[8px]">
                <div class="flex items-center gap-[8px]">
                  <label [class]="labelClass" for="submit-post-url">Post Link</label>
                  <span [class]="requiredClass" aria-hidden="true">*</span>
                </div>
                <div class="relative">
                  <app-platform-glyph
                    class="pointer-events-none absolute top-1/2 left-[12px] size-[20px] -translate-y-1/2 text-[#262626]/[0.36] lg:left-[15px]"
                    variant="mark"
                    [platform]="platform()"
                  />
                  <input
                    id="submit-post-url"
                    type="url"
                    inputmode="url"
                    formControlName="postUrl"
                    [class]="fieldClass + ' ' + fieldWithGlyphClass"
                    [placeholder]="postUrlPlaceholder()"
                    [attr.aria-invalid]="postUrlError() ? 'true' : null"
                  />
                </div>
                @if (postUrlError(); as message) {
                  <p [class]="errorClass">{{ message }}</p>
                }
              </div>

              <div class="flex flex-col gap-[8px]">
                <label [class]="labelClass" for="submit-views">Number of views</label>
                <p-inputnumber
                  inputId="submit-views"
                  class="block w-full"
                  formControlName="claimedViews"
                  placeholder="34,000"
                  mode="decimal"
                  [useGrouping]="true"
                  [maxFractionDigits]="0"
                  [min]="0"
                  [inputStyleClass]="fieldClass"
                />
                @if (fieldError('claimedViews', viewsMessages); as message) {
                  <p [class]="errorClass">{{ message }}</p>
                }
              </div>
            </div>

            <div [class]="ruleClass"></div>

            <p [class]="termsClass" class="pt-[18px] lg:pt-[10px]">
              By adding, you agree to our
              <a routerLink="/terms" target="_blank" rel="noopener" [class]="termsLinkClass"
                >Clapout Terms &amp; Conditions, terms of Service</a
              >, and
              <a routerLink="/privacy" target="_blank" rel="noopener" [class]="termsLinkClass"
                >Privacy Policy</a
              >.
            </p>

            <div class="flex pt-[26px] pb-[8px] lg:pt-[40px] lg:pb-[14px]">
              <button type="submit" [class]="primaryClass" class="w-full">
                Continue
                <ng-container [ngTemplateOutlet]="arrow" />
              </button>
            </div>
          </form>
        }

        <!-- ----------------------------------------------- 2. Screenshot -->
        @case ('screenshot') {
          <div class="pt-[9px]">
            <!-- Screen-reader and keyboard entry point for the dropzone: the
                 label below covers the whole zone, so a click anywhere in it
                 (and Enter on this input) opens the picker. -->
            <input
              id="submit-screenshot-file"
              type="file"
              accept="image/*"
              class="sr-only"
              aria-label="Upload a screenshot of the post or its analytics"
              (change)="onFileSelected($event)"
            />

            <div class="mb-[12px] pb-[35px] lg:mb-0">
              <div class="rounded-[18.8px] border border-[#ECECEC] bg-white p-[18px] py-[19px]">
                @if (form.controls.screenshotUrl.value; as dataUrl) {
                  <div
                    class="flex h-[278px] flex-col items-center justify-center gap-[16px] rounded-[15px] bg-[#F4F4F4] p-[14px]"
                  >
                    <img
                      [src]="dataUrl"
                      alt="The screenshot you attached"
                      class="max-h-[180px] max-w-full rounded-[10px] object-contain"
                    />
                    <div class="flex items-center gap-[12px]">
                      <label [class]="chipClass" class="!px-[18px]" for="submit-screenshot-file"
                        >Replace</label
                      >
                      <button
                        type="button"
                        class="inline-flex h-[36px] cursor-pointer items-center justify-center rounded-[10px] border border-[#D7D7D7] bg-white px-[18px] text-[18px] font-medium text-[#464646] hover:bg-[#F0F0F0]"
                        (click)="clearScreenshot()"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                } @else {
                  <!-- A label, not a button: the zone has a button inside it, and
                       the file input stays focusable for keyboard users. -->
                  <label
                    for="submit-screenshot-file"
                    class="flex h-[278px] cursor-pointer flex-col items-center justify-center gap-[23px] rounded-[15px] transition-colors"
                    [class]="dragging() ? 'bg-[#FBE7DE]' : 'bg-[#F4F4F4]'"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave()"
                    (drop)="onDrop($event)"
                  >
                    <svg
                      viewBox="0 0 52 52"
                      class="block size-[52px]"
                      fill="none"
                      stroke="#868686"
                      stroke-width="3.25"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6.5 20.6h39v18.4a6 6 0 0 1-6 6h-27a6 6 0 0 1-6-6V20.6Z" />
                      <path d="M11.4 14.1h29.2" />
                      <circle cx="35.9" cy="29.3" r="3.5" />
                      <path d="M6.5 39.6 17.9 30a5 5 0 0 1 6.2-.1l10.1 7.6" />
                    </svg>
                    <span [class]="chipClass" aria-hidden="true">
                      {{ resizing() ? 'Preparing…' : 'Upload image' }}
                    </span>
                  </label>
                }
              </div>

              @if (screenshotErrorMessage(); as message) {
                <p [class]="errorClass" class="pt-[10px]" role="alert">{{ message }}</p>
              }
            </div>

            <div [class]="ruleClass"></div>

            <div
              class="flex items-center justify-center gap-[10px] pt-[18px] pb-[8px] lg:gap-[40px] lg:pt-[40px] lg:pb-[14px]"
            >
              <button
                type="button"
                [class]="secondaryClass"
                class="w-[155px] lg:w-[199px]"
                (click)="back()"
              >
                Back
              </button>
              <button
                type="button"
                [class]="primaryClass"
                class="w-[155px] lg:w-[199px]"
                (click)="continueFromScreenshot()"
              >
                Continue
                <ng-container [ngTemplateOutlet]="arrow" />
              </button>
            </div>
          </div>
        }

        <!-- ------------------------------------------ 3/4. Payment prefs -->
        @case ('payout') {
          <form
            [formGroup]="payoutForm"
            class="flex flex-col gap-[12px] lg:gap-[24px]"
            (ngSubmit)="continueFromPayout()"
          >
            <div
              class="rounded-[12px] border border-[#D7D7D7] bg-white py-[6px] lg:rounded-[20px]"
              role="list"
            >
              @for (line of reassurance; track line) {
                <div
                  class="flex items-center gap-[14px] px-[11px] py-[8px] lg:px-[17px]"
                  role="listitem"
                >
                  <svg viewBox="0 0 18 18" class="block size-[18px] shrink-0" aria-hidden="true">
                    <circle cx="9" cy="9" r="9" fill="#00CF60" />
                    <path
                      d="M5.4 9.2 7.8 11.5 12.6 6.5"
                      fill="none"
                      stroke="#FFFFFF"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <!-- The line box, not the glyph, sets the row height: 44 on
                       the 402 board, 34 on the 1728 one. -->
                  <span
                    class="text-[12px] leading-[28px] text-[#7F7F7F] [font-family:var(--clapout-font-heading)] lg:text-[16px] lg:leading-[18px]"
                    >{{ line }}</span
                  >
                </div>
              }
            </div>

            <div class="flex flex-col gap-[8px] pb-[30px] lg:gap-[18px]">
              @if (savedPayout(); as saved) {
                @if (!payoutEditing()) {
                  <div class="flex items-center gap-[8px]">
                    <span [class]="labelClass">Payment method</span>
                  </div>
                  <div
                    class="flex items-center gap-[12px] rounded-[12px] border border-[#D7D7D7] bg-white px-[17px] py-[12px] lg:px-[18px] lg:py-[14px]"
                  >
                    <span class="min-w-0 flex-1">
                      <span class="block text-[16px] font-medium text-[#0C0C0C] lg:text-[18px]">{{
                        methodLabel(saved.method)
                      }}</span>
                      <span class="block text-[14px] text-[#7F7F7F] lg:text-[16px]"
                        >{{ maskedAccount() }} · {{ saved.accountName }}</span
                      >
                    </span>
                    <button
                      type="button"
                      class="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[14px] font-semibold text-[#EC612C] underline underline-offset-2 lg:text-[16px]"
                      (click)="editPayout()"
                    >
                      Change
                    </button>
                  </div>
                }
              }

              @if (!savedPayout() || payoutEditing()) {
                @if (!payoutEditing()) {
                  <div class="flex items-center gap-[8px]">
                    <label [class]="labelClass" for="submit-add-payment">Add payment method</label>
                    <span [class]="requiredClass" aria-hidden="true">*</span>
                  </div>
                  <button
                    id="submit-add-payment"
                    type="button"
                    class="flex h-[41px] w-full cursor-pointer items-center justify-center gap-[10px] rounded-[12px] border border-dashed border-[#D7D7D7] bg-white text-[16px] font-medium text-[#333333] hover:bg-[#FBFBFB] lg:h-[60px] lg:text-[20px]"
                    (click)="editPayout()"
                  >
                    <svg
                      viewBox="0 0 14 14"
                      class="block size-[10px] lg:size-[13px]"
                      fill="none"
                      stroke="#1C274C"
                      stroke-width="2"
                      stroke-linecap="round"
                      aria-hidden="true"
                    >
                      <path d="M7 1v12M1 7h12" />
                    </svg>
                    Add payment method
                  </button>
                } @else {
                  <div class="flex flex-col gap-[8px]">
                    <label [class]="labelClass" for="submit-network">Network</label>
                    <p-select
                      inputId="submit-network"
                      formControlName="method"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select network"
                      class="h-[50px] w-full rounded-[12px] border border-[#D7D7D7] bg-white px-[17px] text-[18px] lg:px-[18px] lg:text-[20px] [&_.p-select-label]:px-0 [&_.p-select-label]:text-[18px] [&_.p-select-label.p-placeholder]:text-[#383838] lg:[&_.p-select-label]:text-[20px]"
                      [options]="networkOptions"
                    />
                    @if (payoutError('method'); as message) {
                      <p [class]="errorClass">{{ message }}</p>
                    }
                  </div>

                  <div class="flex flex-col gap-[8px]">
                    <label [class]="labelClass" for="submit-account-number">Account number</label>
                    <input
                      id="submit-account-number"
                      type="text"
                      inputmode="tel"
                      autocomplete="off"
                      formControlName="accountNumber"
                      placeholder="Account no."
                      [class]="fieldClass"
                      [attr.aria-invalid]="payoutError('accountNumber') ? 'true' : null"
                    />
                    @if (payoutError('accountNumber'); as message) {
                      <p [class]="errorClass">{{ message }}</p>
                    }
                  </div>

                  <!-- The boards stop at the account number, but PATCH /me
                       requires the name the account is registered in, and the
                       admin pays out against it. Prefilled from the session. -->
                  <div class="flex flex-col gap-[8px]">
                    <label [class]="labelClass" for="submit-account-name">Account name</label>
                    <input
                      id="submit-account-name"
                      type="text"
                      autocomplete="name"
                      formControlName="accountName"
                      placeholder="Name on the account"
                      [class]="fieldClass"
                      [attr.aria-invalid]="payoutError('accountName') ? 'true' : null"
                    />
                    @if (payoutError('accountName'); as message) {
                      <p [class]="errorClass">{{ message }}</p>
                    }
                  </div>
                }
              }

              @if (payoutErrorMessage(); as message) {
                <p [class]="errorClass" role="alert">{{ message }}</p>
              }
            </div>

            <p [class]="termsClass">
              By adding, you agree to our
              <a routerLink="/terms" target="_blank" rel="noopener" [class]="termsLinkClass"
                >Clapout Terms &amp; Conditions, terms of Service</a
              >, and
              <a routerLink="/privacy" target="_blank" rel="noopener" [class]="termsLinkClass"
                >Privacy Policy</a
              >.
            </p>

            <div
              class="flex items-center justify-center gap-[10px] pb-[8px] lg:gap-[40px] lg:pb-[14px]"
            >
              <button
                type="button"
                [class]="secondaryClass"
                class="w-[155px] lg:w-[199px]"
                [disabled]="submitting()"
                (click)="back()"
              >
                Back
              </button>
              <button
                type="submit"
                [class]="primaryClass"
                class="w-[155px] lg:w-[199px]"
                [disabled]="submitting()"
              >
                {{ submitting() ? 'Submitting…' : 'Continue' }}
                @if (!submitting()) {
                  <ng-container [ngTemplateOutlet]="arrow" />
                }
              </button>
            </div>
          </form>
        }

        <!-- -------------------------------------------------- 5. Success -->
        @case ('success') {
          <div class="flex flex-col gap-[12px]">
            <div class="h-px w-full bg-[#DFDFDF] lg:hidden"></div>
            <button type="button" [class]="primaryClass" class="w-full" (click)="close()">
              Return to campaign
            </button>
          </div>
        }
      }
    </app-overlay-sheet>

    <ng-template #arrow>
      <svg
        viewBox="0 0 24 24"
        class="block size-[16px] lg:size-[24px]"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12h15M13 6l6 6-6 6" />
      </svg>
    </ng-template>
  `,
})
export class SubmitPostDialog {
  /** Two-way: the campaign page opens it from `?submit=1`. */
  readonly visible = model(false);
  readonly campaign = input.required<PublicCampaign>();
  /** The clipper's ACCEPTED registration for {@link campaign}. */
  readonly registration = input.required<Registration>();
  /** Fires the moment `POST /submissions` succeeds, before the success panel. */
  readonly submitted = output<Submission>();

  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_ENVIRONMENT).apiBaseUrl;
  private readonly submissions = inject(SubmissionsRepository);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly messages = inject(MessageService);
  private readonly confirmations = inject(ConfirmationService);
  private readonly auth = inject(AuthService);

  protected readonly step = signal<SubmitStep>('link');
  protected readonly submitting = signal(false);
  protected readonly payoutEditing = signal(false);
  protected readonly resizing = signal(false);
  protected readonly dragging = signal(false);
  protected readonly linkSubmitted = signal(false);
  protected readonly payoutSubmitted = signal(false);
  protected readonly linkErrorMessage = signal('');
  protected readonly screenshotErrorMessage = signal('');
  protected readonly payoutErrorMessage = signal('');
  /**
   * `AuthService.user` is read-only and has no refresh, so what this overlay
   * saved is remembered here for the rest of the session.
   */
  protected readonly savedPayout = signal<PayoutDetails | null>(null);

  protected readonly networkOptions = NETWORK_OPTIONS;
  protected readonly viewsMessages = VIEWS_MESSAGES;
  protected readonly reassurance = [
    'Add your payment methods to receive earnings',
    'Your payment method info will be secured',
    'This step is important - please check details well.',
  ];

  protected readonly subtitleClass = SHEET_SUBTITLE_CLASS;
  protected readonly labelClass = SHEET_LABEL_CLASS;
  protected readonly fieldClass = SHEET_FIELD_CLASS;
  protected readonly fieldWithGlyphClass = SHEET_FIELD_WITH_GLYPH_CLASS;
  protected readonly primaryClass = SHEET_PRIMARY_BUTTON_CLASS;
  protected readonly secondaryClass = SHEET_SECONDARY_BUTTON_CLASS;
  protected readonly chipClass = SHEET_CHIP_BUTTON_CLASS;
  protected readonly requiredClass = SHEET_REQUIRED_CLASS;
  protected readonly ruleClass = SHEET_RULE_CLASS;
  protected readonly termsClass = SHEET_TERMS_CLASS;
  protected readonly termsLinkClass = SHEET_TERMS_LINK_CLASS;
  protected readonly errorClass = SHEET_ERROR_CLASS;

  /** Declared before the form: its post-link validator reads this. */
  protected readonly platform = computed<CampaignPlatform | null>(
    () => this.registration()?.platform ?? null,
  );

  protected readonly form = this.formBuilder.group({
    postUrl: [
      '',
      [
        Validators.required,
        httpUrlValidator,
        (control: AbstractControl) => this.platformError(control),
      ],
    ],
    claimedViews: this.formBuilder.control<number | null>(null, [
      Validators.min(0),
      integerValidator,
    ]),
    screenshotUrl: ['', [Validators.required]],
  });

  protected readonly payoutForm = this.formBuilder.group({
    method: this.formBuilder.control<PayoutMethod | null>(null, [Validators.required]),
    accountNumber: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9+ ]+$/),
        Validators.minLength(6),
        Validators.maxLength(20),
      ],
    ],
    accountName: ['', [Validators.required, Validators.maxLength(100)]],
  });

  protected readonly postUrlPlaceholder = computed(() => {
    const platform = this.platform();
    return platform ? platformPostPlaceholder(platform) : 'https://';
  });

  /** Only the first board carries the platform row; the later ones do not. */
  protected readonly sheetPlatforms = computed<readonly CampaignPlatform[]>(() =>
    this.step() === 'link' ? SHEET_PLATFORMS : [],
  );

  protected readonly sheetTitle = computed(() => {
    switch (this.step()) {
      case 'link':
        // Two spaces, as the board sets it; the first is a non-breaking one
        // so HTML whitespace collapsing keeps the gap.
        return 'Submit  Post link';
      case 'screenshot':
        return 'Upload Screenshot';
      case 'payout':
        return 'Payment preferences';
      default:
        return 'Successful';
    }
  });

  /** Steps whose subtitle is plain text; the other two project a rich one. */
  protected readonly sheetSubtitle = computed(() => {
    switch (this.step()) {
      case 'screenshot':
        return 'Submit the screenshot of the analytics of the post to prove that you have the views.';
      case 'payout':
        return 'Add how you’d like to receive payment for your clips';
      default:
        return '';
    }
  });

  protected readonly maskedAccount = computed(() =>
    maskAccountNumber(this.savedPayout()?.accountNumber ?? ''),
  );

  /**
   * Bound to the sheet once: a stable reference, so the input does not change
   * identity on every change detection pass.
   */
  protected readonly closeGuard = (): Promise<boolean> => this.confirmDiscard();

  constructor() {
    // Every visit starts from an empty step 1, exactly like `socials-dialog`:
    // an abandoned draft must never reappear on the next campaign.
    effect(() => {
      if (this.visible()) {
        untracked(() => this.reset());
      }
    });
  }

  // ----------------------------------------------------------------- steps

  protected continueFromLink(): void {
    this.linkSubmitted.set(true);
    this.linkErrorMessage.set('');
    const { postUrl, claimedViews } = this.form.controls;
    postUrl.markAsTouched();
    claimedViews.markAsTouched();
    if (postUrl.invalid || claimedViews.invalid) {
      return;
    }
    this.step.set('screenshot');
  }

  protected continueFromScreenshot(): void {
    if (!this.form.controls.screenshotUrl.value) {
      this.screenshotErrorMessage.set('Add a screenshot of the post or its analytics.');
      return;
    }
    this.screenshotErrorMessage.set('');
    this.step.set('payout');
  }

  protected async continueFromPayout(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    this.payoutErrorMessage.set('');

    const needsForm = !this.savedPayout() || this.payoutEditing();
    if (needsForm) {
      this.payoutSubmitted.set(true);
      this.payoutForm.markAllAsTouched();
      if (this.payoutForm.invalid) {
        // The dashed button has to open before its fields can be corrected.
        this.payoutEditing.set(true);
        return;
      }
    }
    await this.send(needsForm);
  }

  protected back(): void {
    if (this.submitting()) {
      return;
    }
    if (this.step() === 'payout') {
      this.step.set('screenshot');
      return;
    }
    if (this.step() === 'screenshot') {
      this.step.set('link');
    }
  }

  protected close(): void {
    this.visible.set(false);
  }

  protected editPayout(): void {
    const saved = this.savedPayout();
    this.payoutForm.reset({
      method: saved?.method ?? null,
      accountNumber: saved?.accountNumber ?? '',
      accountName: saved?.accountName ?? this.auth.user()?.fullName ?? '',
    });
    this.payoutSubmitted.set(false);
    this.payoutEditing.set(true);
  }

  // ---------------------------------------------------------------- errors

  protected fieldError(field: 'claimedViews', messages: Record<string, string>): string | null {
    return firstErrorMessage(this.form.controls[field], messages, this.linkSubmitted());
  }

  /** The wrong-platform message is written per platform, so it resolves late. */
  protected postUrlError(): string | null {
    const control = this.form.controls.postUrl;
    if (control.hasError('platform') && (control.touched || this.linkSubmitted())) {
      const platform = this.platform();
      return platform ? platformMismatchMessage(platform) : LINK_MESSAGES['platform'];
    }
    return firstErrorMessage(control, LINK_MESSAGES, this.linkSubmitted());
  }

  protected payoutError(field: 'method' | 'accountNumber' | 'accountName'): string | null {
    return firstErrorMessage(
      this.payoutForm.controls[field],
      PAYOUT_MESSAGES[field],
      this.payoutSubmitted(),
    );
  }

  protected methodLabel(method: PayoutMethod): string {
    return PAYOUT_METHOD_LABELS[method];
  }

  // ------------------------------------------------------------ screenshot

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave(): void {
    this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void this.acceptFile(file);
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      void this.acceptFile(file);
    }
  }

  protected clearScreenshot(): void {
    this.screenshotErrorMessage.set('');
    this.form.controls.screenshotUrl.setValue('');
  }

  private async acceptFile(file: File): Promise<void> {
    const rejection = screenshotFileError(file);
    if (rejection) {
      this.screenshotErrorMessage.set(rejection);
      return;
    }

    this.screenshotErrorMessage.set('');
    this.resizing.set(true);
    try {
      this.form.controls.screenshotUrl.setValue(await resizeImageToDataUrl(file));
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      this.screenshotErrorMessage.set(
        reason === 'too-large'
          ? 'We could not shrink that image enough. Try a cropped screenshot instead.'
          : 'We could not read that image. Try another screenshot.',
      );
    } finally {
      this.resizing.set(false);
    }
  }

  // ---------------------------------------------------------------- submit

  private async send(savePayout: boolean): Promise<void> {
    this.submitting.set(true);
    try {
      if (savePayout) {
        const patch = payoutPatch(this.savedPayout(), this.payoutForm.getRawValue());
        if (patch) {
          try {
            const response = await firstValueFrom(
              this.http.patch<{ user: Me }>(`${this.baseUrl}/me`, { payout: patch }),
            );
            this.savedPayout.set(response.user?.payout ?? patch);
          } catch (error) {
            // A payout failure belongs to the step the clipper is standing on.
            this.payoutErrorMessage.set(toApiError(error).message);
            return;
          }
        }
        this.payoutEditing.set(false);
      }

      const value = this.form.getRawValue();
      try {
        const created = await this.submissions.create({
          registrationId: this.registration().id,
          postUrl: value.postUrl.trim(),
          screenshotUrl: value.screenshotUrl,
          ...(value.claimedViews !== null ? { claimedViews: value.claimedViews } : {}),
        });
        this.submitted.emit(created);
        this.messages.add({
          severity: 'success',
          summary: 'Clip submitted',
          detail: 'It is now waiting for review.',
        });
        this.step.set('success');
      } catch (error) {
        const message = submissionErrorMessage(error, this.platform());
        if (isPostUrlSubmissionError(error)) {
          this.linkErrorMessage.set(message);
          this.step.set('link');
        } else {
          this.payoutErrorMessage.set(message);
        }
      }
    } finally {
      this.submitting.set(false);
    }
  }

  // ----------------------------------------------------------------- close

  /** True once anything the clipper typed or picked would be thrown away. */
  private hasData(): boolean {
    const { postUrl, claimedViews, screenshotUrl } = this.form.getRawValue();
    if (postUrl.trim() || claimedViews !== null || screenshotUrl) {
      return true;
    }
    const payout = this.payoutForm.getRawValue();
    return this.payoutEditing() && Boolean(payout.method || payout.accountNumber.trim());
  }

  private confirmDiscard(): Promise<boolean> {
    if (this.step() === 'success' || !this.hasData()) {
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      this.confirmations.confirm({
        header: 'Discard this submission?',
        message: 'The link, screenshot and payment details you entered will not be saved.',
        acceptLabel: 'Discard',
        rejectLabel: 'Keep editing',
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }

  /**
   * The empty-field check comes first on purpose: this validator runs once
   * while the form is being built, before `registration` (a required input) has
   * a value, and the field is empty then.
   */
  private platformError(control: AbstractControl): ValidationErrors | null {
    if (typeof control.value !== 'string' || !control.value.trim()) {
      return null;
    }
    const platform = this.platform();
    return !platform || isPlatformPostUrl(platform, control.value) ? null : { platform: true };
  }

  private reset(): void {
    this.step.set('link');
    this.submitting.set(false);
    this.resizing.set(false);
    this.dragging.set(false);
    this.linkSubmitted.set(false);
    this.payoutSubmitted.set(false);
    this.payoutEditing.set(false);
    this.linkErrorMessage.set('');
    this.screenshotErrorMessage.set('');
    this.payoutErrorMessage.set('');
    this.savedPayout.set(this.auth.user()?.payout ?? null);
    this.form.reset({ postUrl: '', claimedViews: null, screenshotUrl: '' });
    this.payoutForm.reset({
      method: null,
      accountNumber: '',
      accountName: this.auth.user()?.fullName ?? '',
    });
  }
}
