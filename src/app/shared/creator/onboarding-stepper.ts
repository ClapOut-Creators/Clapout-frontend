import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { CampaignPlatform } from '../../core/models/campaign';
import { SocialAccount } from '../../core/models/user';
import { platformFromUrl } from '../../core/util/platform-url';
import { firstErrorMessage, httpUrlValidator } from '../forms/form-errors';
import {
  PlatformGlyph,
  SHEET_CHIP_BUTTON_CLASS,
  SHEET_ERROR_CLASS,
  SHEET_FIELD_CLASS,
  SHEET_FIELD_WITH_GLYPH_CLASS,
  SHEET_LABEL_CLASS,
  SHEET_PRIMARY_BUTTON_CLASS,
  SHEET_SECONDARY_BUTTON_CLASS,
} from './overlay-sheet';

/** Invite link for the creator community, opened in a new tab. */
export const COMMUNITY_URL = 'https://chat.whatsapp.com/L9d71dKBrFy7QonMQJ73da';

export type OnboardingStep = 'socials' | 'community' | 'done';

const STEPS: readonly OnboardingStep[] = ['socials', 'community', 'done'];

const LINK_MESSAGES: Record<string, string> = {
  required: 'Add the link, or remove this row.',
  url: 'Enter a full URL, for example https://www.tiktok.com/@yourname.',
};

const SHEET_PLATFORMS: readonly CampaignPlatform[] = ['tiktok', 'instagram', 'youtube'];

/** Trimmed, blanks dropped, de-duplicated — the same shape the socials sheet saves. */
function dedupe(values: readonly string[]): SocialAccount[] {
  const urls = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return urls.map((url) => ({ url }));
}

function sameSocials(left: readonly SocialAccount[], right: readonly SocialAccount[]): boolean {
  return left.length === right.length && left.every((item, index) => item.url === right[index].url);
}

/**
 * The three onboarding steps every creator must complete once: add at least
 * one social account, join the WhatsApp community, then go and find a
 * campaign. It is the body of both the `/creator/onboarding` page a fresh
 * sign-up lands on and the sheet the dashboard raises for anyone who signed up
 * before onboarding existed — the host decides where "finish" leads.
 *
 * Neither step can be skipped. Socials save through `PATCH /me` and need at
 * least one valid link. The community step cannot verify a WhatsApp join from
 * outside the app, so it does the strongest thing it can: the confirm button
 * only unlocks once the invite link has actually been opened, and it is that
 * confirmation which stamps `communityJoinedAt`.
 */
@Component({
  imports: [PlatformGlyph, ReactiveFormsModule],
  selector: 'app-onboarding-stepper',
  host: { class: 'block' },
  template: `
    <ol class="m-0 mb-[28px] flex list-none justify-center gap-[10px] p-0" aria-label="Progress">
      @for (item of steps; track item; let index = $index) {
        <li
          class="h-[6px] w-[44px] rounded-full transition-colors"
          [class]="index <= stepIndex() ? 'bg-[#EC612C]' : 'bg-[#E4E4E4]'"
          [attr.aria-current]="item === step() ? 'step' : null"
        >
          <span class="sr-only">Step {{ index + 1 }}{{ item === step() ? ', current' : '' }}</span>
        </li>
      }
    </ol>

    @switch (step()) {
      @case ('socials') {
        <p class="m-0 mb-[4px] text-center text-[14px] font-medium text-[#EC612C]">Step 1 of 3</p>
        <h3 [class]="headingClass">Add your social accounts</h3>
        <p [class]="bodyClass">
          Link the TikTok, Instagram or YouTube profile you will be clipping from. Brands see these
          when they review your work.
        </p>

        @if (errorMessage(); as message) {
          <p [class]="errorClass" class="mb-[12px]" role="alert">{{ message }}</p>
        }

        <div class="flex flex-col gap-[8px]">
          <span [class]="labelClass">Social link</span>
          @for (control of links.controls; track $index) {
            <div class="flex items-start gap-[10px]">
              <div class="relative min-w-0 flex-1">
                <app-platform-glyph
                  class="pointer-events-none absolute top-1/2 left-[12px] size-[20px] -translate-y-1/2 text-[#262626]/[0.36] lg:left-[15px]"
                  variant="mark"
                  [platform]="platformOf(control.value)"
                />
                <input
                  type="url"
                  inputmode="url"
                  placeholder="https://www.tiktok.com/@yourname"
                  [class]="fieldClass + ' ' + fieldWithGlyphClass"
                  [id]="'onboarding-social-' + $index"
                  [attr.aria-label]="'Social link ' + ($index + 1)"
                  [attr.aria-invalid]="linkError($index) ? 'true' : null"
                  [formControl]="control"
                />
              </div>
              @if (links.length > 1) {
                <button
                  type="button"
                  class="flex size-[50px] shrink-0 cursor-pointer items-center justify-center rounded-[12px] border border-[#FDC5C5] bg-[#FFF3F3] text-[#DF5454] hover:bg-[#FFE8E8]"
                  [attr.aria-label]="'Remove social link ' + ($index + 1)"
                  (click)="removeLink($index)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="block size-[24px]"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    aria-hidden="true"
                  >
                    <path d="M3.5 6h17" />
                    <path
                      d="M18.8 8.5 18.2 18a2.6 2.6 0 0 1-2.6 2.4H8.4A2.6 2.6 0 0 1 5.8 18l-.6-9.5"
                    />
                    <path d="M9.6 11v5M14.4 11v5" />
                    <path d="M8.9 6V4.9c0-.8.6-1.4 1.4-1.4h3.4c.8 0 1.4.6 1.4 1.4V6" />
                  </svg>
                </button>
              }
            </div>
            @if (linkError($index); as fieldMessage) {
              <p [class]="errorClass">{{ fieldMessage }}</p>
            }
          }
          <div class="mt-[2px] flex">
            <button type="button" [class]="chipClass" (click)="addLink()">Add link</button>
          </div>
        </div>

        <div class="mt-[28px] flex">
          <button
            type="button"
            [class]="primaryClass"
            class="w-full"
            [disabled]="saving()"
            (click)="saveSocials()"
          >
            {{ saving() ? 'Saving…' : 'Save and continue' }}
          </button>
        </div>
      }

      @case ('community') {
        <p class="m-0 mb-[4px] text-center text-[14px] font-medium text-[#EC612C]">Step 2 of 3</p>
        <h3 [class]="headingClass">Join our WhatsApp community</h3>
        <p [class]="bodyClass">
          Every campaign brief, payout update and clipping tip lands in the community first. Open
          the invite, tap <strong class="font-semibold text-[#2B2B2B]">Join</strong> in WhatsApp,
          then come back and confirm.
        </p>

        @if (errorMessage(); as message) {
          <p [class]="errorClass" class="mb-[12px]" role="alert">{{ message }}</p>
        }

        <div class="flex flex-col gap-[12px]">
          <a
            [href]="communityUrl"
            target="_blank"
            rel="noopener noreferrer"
            [class]="linkOpened() ? secondaryClass : primaryClass"
            class="w-full no-underline"
            (click)="markLinkOpened()"
          >
            {{ linkOpened() ? 'Open the invite again' : 'Join the community' }}
          </a>
          <button
            type="button"
            [class]="linkOpened() ? primaryClass : secondaryClass"
            class="w-full"
            [disabled]="!linkOpened() || saving()"
            (click)="confirmJoined()"
          >
            {{ saving() ? 'Saving…' : 'I have joined, continue' }}
          </button>
          @if (!linkOpened()) {
            <p class="m-0 text-center text-[14px] leading-[19px] text-[#898989]">
              Open the invite first to unlock the next step.
            </p>
          }
        </div>
      }

      @case ('done') {
        <p class="m-0 mb-[4px] text-center text-[14px] font-medium text-[#EC612C]">Step 3 of 3</p>
        <h3 [class]="headingClass">You are all set</h3>
        <p [class]="bodyClass">
          Your socials are linked and you are part of the movement. Pick a campaign, register, and
          start clipping.
        </p>
        <div class="mt-[8px] flex">
          <button type="button" [class]="primaryClass" class="w-full" (click)="finished.emit()">
            {{ finishLabel() }}
          </button>
        </div>
      }
    }
  `,
})
export class OnboardingStepper {
  /** The final step's button; the page says "Browse campaigns", the dashboard sheet differs. */
  readonly finishLabel = input('Browse campaigns');
  /** The final button was pressed; the host decides where that leads. */
  readonly finished = output<void>();

  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly steps = STEPS;
  protected readonly step = signal<OnboardingStep>('socials');
  protected readonly stepIndex = computed(() => STEPS.indexOf(this.step()));
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  /** The invite has been opened at least once; only then can the join be confirmed. */
  protected readonly linkOpened = signal(false);

  protected readonly links = new FormArray<FormControl<string>>([]);

  protected readonly communityUrl = COMMUNITY_URL;
  protected readonly platforms = SHEET_PLATFORMS;
  protected readonly labelClass = SHEET_LABEL_CLASS;
  protected readonly fieldClass = SHEET_FIELD_CLASS;
  protected readonly fieldWithGlyphClass = SHEET_FIELD_WITH_GLYPH_CLASS;
  protected readonly chipClass = SHEET_CHIP_BUTTON_CLASS;
  protected readonly primaryClass = SHEET_PRIMARY_BUTTON_CLASS;
  protected readonly secondaryClass = SHEET_SECONDARY_BUTTON_CLASS;
  protected readonly errorClass = SHEET_ERROR_CLASS;
  protected readonly headingClass =
    'm-0 mb-[10px] text-center text-[22px] leading-[30px] font-semibold text-[#2B2B2B] lg:text-[26px] lg:leading-[34px]';
  protected readonly bodyClass =
    'm-0 mb-[24px] text-center text-[15px] leading-[23px] text-[#6B6B6B] lg:text-[16px] lg:leading-[26px]';

  constructor() {
    // Existing sign-ups arrive with socials already saved; seed them so the
    // step is a confirmation rather than a retype.
    const saved = this.auth.user()?.socials ?? [];
    for (const account of saved) {
      this.links.push(this.createLink(account.url));
    }
    if (this.links.length === 0) {
      this.links.push(this.createLink());
    }
  }

  protected platformOf(url: string): CampaignPlatform | null {
    return platformFromUrl(url);
  }

  protected linkError(index: number): string | null {
    return firstErrorMessage(this.links.at(index), LINK_MESSAGES, this.submitted());
  }

  protected addLink(): void {
    this.links.push(this.createLink());
  }

  protected removeLink(index: number): void {
    if (this.links.length > 1) {
      this.links.removeAt(index);
    }
  }

  protected async saveSocials(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.saving()) {
      return;
    }
    if (this.links.invalid) {
      this.links.markAllAsTouched();
      return;
    }
    const socials = dedupe(this.links.controls.map((control) => control.value));
    if (socials.length === 0) {
      this.errorMessage.set('Add at least one social account to continue.');
      return;
    }
    // Nothing changed for a returning creator: no request, straight on.
    if (sameSocials(socials, this.auth.user()?.socials ?? [])) {
      this.step.set('community');
      return;
    }

    this.saving.set(true);
    try {
      await this.auth.updateProfile({ socials });
      this.step.set('community');
    } catch (error) {
      this.errorMessage.set(toApiError(error).message);
    } finally {
      this.saving.set(false);
    }
  }

  /** The anchor still opens the invite in a new tab; this only records that it did. */
  protected markLinkOpened(): void {
    this.linkOpened.set(true);
    this.errorMessage.set('');
  }

  protected async confirmJoined(): Promise<void> {
    if (!this.linkOpened() || this.saving()) {
      return;
    }
    this.errorMessage.set('');
    this.saving.set(true);
    try {
      await this.auth.updateProfile({ communityJoined: true });
      this.step.set('done');
    } catch (error) {
      this.errorMessage.set(toApiError(error).message);
    } finally {
      this.saving.set(false);
    }
  }

  private createLink(url = ''): FormControl<string> {
    return this.formBuilder.control(url, [Validators.required, httpUrlValidator]);
  }
}
