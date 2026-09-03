import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { APP_ENVIRONMENT } from '../../core/config/app-environment';
import { CampaignPlatform } from '../../core/models/campaign';
import { Me, SocialAccount } from '../../core/models/user';
import { platformFromUrl } from '../../core/util/platform-url';
import {
  OverlaySheet,
  PlatformGlyph,
  SHEET_CHIP_BUTTON_CLASS,
  SHEET_ERROR_CLASS,
  SHEET_FIELD_CLASS,
  SHEET_FIELD_WITH_GLYPH_CLASS,
  SHEET_LABEL_CLASS,
  SHEET_PRIMARY_BUTTON_CLASS,
  SHEET_RULE_CLASS,
  SHEET_TERMS_CLASS,
  SHEET_TERMS_LINK_CLASS,
} from '../../shared/creator/overlay-sheet';
import { firstErrorMessage, httpUrlValidator } from '../../shared/forms/form-errors';

const LINK_MESSAGES: Record<string, string> = {
  required: 'Add the link, or remove this row.',
  url: 'Enter a full URL, for example https://www.tiktok.com/@yourname.',
};

/**
 * The `socials` body for `PATCH /me`: trimmed, blanks dropped, and de-duplicated
 * so two rows pointing at the same profile are stored once. Exported because
 * this is the only part of the save the API cannot correct for us.
 */
export function dedupeSocialUrls(values: readonly string[]): SocialAccount[] {
  const urls = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return urls.map((url) => ({ url }));
}

/** The tiles the board draws under the subtitle. */
const SHEET_PLATFORMS: readonly CampaignPlatform[] = ['tiktok', 'instagram', 'youtube'];

/**
 * "Add your social account" — Figma 397:1535 (desktop) / 378:640 (mobile).
 *
 * Built on {@link OverlaySheet}: the full-screen blurred sheet replaced the
 * small `p-dialog` this used to be, but the component's API did not change —
 * the creator dashboard still binds `visible`, `socials` and `saved`.
 *
 * Saves through `PATCH /me` directly rather than `AuthService`, which exposes no
 * profile mutation and holds `user` as a read-only signal. The saved list is
 * emitted back to the parent so the checklist can flip to done without waiting
 * for the next `GET /me`.
 *
 * Escape, the × and a backdrop click close it without a confirmation: nothing
 * here is lost that is not one paste away, and the sheet reseeds from the saved
 * list every time it opens.
 */
@Component({
  imports: [OverlaySheet, PlatformGlyph, ReactiveFormsModule, RouterLink],
  selector: 'app-socials-dialog',
  template: `
    <app-overlay-sheet
      [(visible)]="visible"
      title="Add your social account"
      subtitle="Share your social media profile to start tracking your content and earning"
      [platforms]="platforms"
    >
      <!-- The 9px lid is on the 1728 board only; the 402 one starts flush. -->
      <div class="lg:pt-[9px]">
        @if (errorMessage(); as message) {
          <p [class]="errorClass" class="mb-[12px]" role="alert">{{ message }}</p>
        }

        <div class="mb-[12px] flex flex-col gap-[8px] pb-[30px] lg:mb-0 lg:pb-[35px]">
          <span [class]="labelClass" id="socials-links-label">Social Link</span>

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
                  [id]="'social-url-' + $index"
                  [attr.aria-label]="'Social link ' + ($index + 1)"
                  [attr.aria-invalid]="linkError($index) ? 'true' : null"
                  [formControl]="control"
                />
              </div>
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
            </div>
            @if (linkError($index); as fieldMessage) {
              <p [class]="errorClass">{{ fieldMessage }}</p>
            }
          } @empty {
            <p class="m-0 text-[14px] leading-[19px] text-[#808080] lg:text-[16px]">
              You have no links left. Add one, or save to clear your social accounts.
            </p>
          }

          <div class="mt-[2px] flex">
            <button type="button" [class]="chipClass" (click)="addLink()">Add link</button>
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
          <button
            type="button"
            [class]="primaryClass"
            class="w-full"
            [disabled]="saving()"
            (click)="save()"
          >
            {{ saving() ? 'Saving…' : 'Save social' }}
          </button>
        </div>
      </div>
    </app-overlay-sheet>
  `,
})
export class SocialsDialog {
  /** Two-way: the dashboard opens it, the sheet closes itself. */
  readonly visible = model(false);
  /** Seeds the rows every time the sheet opens. */
  readonly socials = input<SocialAccount[]>([]);
  /** The list `PATCH /me` echoed back, so the caller can drop its stale copy. */
  readonly saved = output<SocialAccount[]>();

  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_ENVIRONMENT).apiBaseUrl;
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly messages = inject(MessageService);

  protected readonly links = new FormArray<FormControl<string>>([]);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly platforms = SHEET_PLATFORMS;
  protected readonly labelClass = SHEET_LABEL_CLASS;
  protected readonly fieldClass = SHEET_FIELD_CLASS;
  protected readonly fieldWithGlyphClass = SHEET_FIELD_WITH_GLYPH_CLASS;
  protected readonly chipClass = SHEET_CHIP_BUTTON_CLASS;
  protected readonly primaryClass = SHEET_PRIMARY_BUTTON_CLASS;
  protected readonly ruleClass = SHEET_RULE_CLASS;
  protected readonly termsClass = SHEET_TERMS_CLASS;
  protected readonly termsLinkClass = SHEET_TERMS_LINK_CLASS;
  protected readonly errorClass = SHEET_ERROR_CLASS;

  constructor() {
    // Reopening always starts from the saved list, so an abandoned edit never
    // leaks into the next visit.
    effect(() => {
      if (this.visible()) {
        untracked(() => this.reset());
      }
    });
  }

  /** The glyph drawn inside a row, derived from what the clipper has typed. */
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
    this.links.removeAt(index);
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.saving()) {
      return;
    }
    if (this.links.invalid) {
      this.links.markAllAsTouched();
      return;
    }

    const socials = dedupeSocialUrls(this.links.controls.map((control) => control.value));

    this.saving.set(true);
    try {
      const response = await firstValueFrom(
        this.http.patch<{ user: Me }>(`${this.baseUrl}/me`, { socials }),
      );
      this.saved.emit(response.user?.socials ?? socials);
      this.messages.add({
        severity: 'success',
        summary: 'Social accounts saved',
        detail: socials.length === 1 ? '1 link saved.' : `${socials.length} links saved.`,
      });
      this.visible.set(false);
    } catch (error) {
      this.errorMessage.set(toApiError(error).message);
    } finally {
      this.saving.set(false);
    }
  }

  private createLink(url = ''): FormControl<string> {
    return this.formBuilder.control(url, [Validators.required, httpUrlValidator]);
  }

  private reset(): void {
    this.submitted.set(false);
    this.errorMessage.set('');
    this.saving.set(false);
    this.links.clear();
    const seeded = this.socials();
    if (seeded.length === 0) {
      this.links.push(this.createLink());
      return;
    }
    for (const account of seeded) {
      this.links.push(this.createLink(account.url));
    }
  }
}
