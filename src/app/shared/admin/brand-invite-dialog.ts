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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Check } from '@primeicons/angular/check';
import { Copy } from '@primeicons/angular/copy';
import { Whatsapp } from '@primeicons/angular/whatsapp';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { BrandInvite } from '../../core/models/brand-invite';
import { Option } from '../../core/util/admin-options';
import { relativeTime } from '../../core/util/campaign-format';
import {
  brandInviteLink,
  brandInviteMessage,
  normaliseWebsiteHint,
  whatsappShareUrl,
} from '../../core/util/brand-invite-link';
import {
  DEFAULT_PHONE_ISO,
  PHONE_CODES,
  dialCodeFor,
  splitInternationalPhone,
  toInternationalPhone,
} from '../../core/util/phone-codes';
import { firstErrorMessage } from '../forms/form-errors';

/** What the host already knows about the brand, e.g. from a partnership inquiry. */
export interface BrandInvitePrefill {
  brandName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  /** International, e.g. '+233201234567' — split back onto the two controls. */
  contactPhone?: string | null;
  website?: string | null;
  /** Sent with the invite so the API can move the inquiry to CONTACTED. */
  inquiryId?: string | null;
}

const EXPIRY_OPTIONS: Option<number>[] = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
];

/** Long enough to read, short enough not to look stuck. */
const COPIED_FEEDBACK_MS = 2000;

const EMAIL_MESSAGE = 'Enter a valid email address, for example name@brand.com';

const MESSAGES: Record<string, Record<string, string>> = {
  contactEmail: { email: EMAIL_MESSAGE },
  to: { required: 'Enter the address the link should go to.', email: EMAIL_MESSAGE },
};

/**
 * What the admin reads when a send is refused, keyed on the contract's codes.
 * `EMAIL_FAILED` passes Resend's own reason straight through — "domain not
 * verified" or "recipient suppressed" is the whole answer, and paraphrasing it
 * would only hide the one useful sentence.
 */
export function brandInviteEmailError(error: unknown): string {
  const fallback = 'We could not send this email. Please try again in a moment.';
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  switch (error.code) {
    case 'INVITE_EMAIL_MISSING':
      return 'This invite has no email address — type one above and send again.';
    case 'VALIDATION':
      return error.message || EMAIL_MESSAGE;
    case 'INVITE_NOT_PENDING':
      return 'This invite is no longer live, so it cannot be emailed. Create a new one.';
    case 'INVITE_NOT_FOUND':
      return 'This invite no longer exists. Refresh the list and try again.';
    case 'EMAIL_FAILED':
    default:
      return error.message || fallback;
  }
}

/**
 * "Invite a brand": creates a single-use onboarding link and then hands the
 * admin the link itself.
 *
 * Every field is optional — the invite is a prefill hint, not a contract, and
 * the brand's representative fills in the real thing. The dialog stays open
 * after a successful create and switches to the link state, because the link
 * is the entire point and the API never sends it anywhere: the admin does.
 */
@Component({
  imports: [
    ButtonModule,
    Check,
    CheckboxModule,
    Copy,
    DialogModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    SelectModule,
    TextareaModule,
    Whatsapp,
  ],
  selector: 'app-brand-invite-dialog',
  template: `
    <p-dialog
      header="Invite a brand"
      styleClass="!w-[min(34rem,calc(100vw-2rem))]"
      [modal]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
    >
      @if (invite(); as created) {
        <!-- Link ready: nothing was emailed, so the admin sends it themselves. -->
        <div class="flex flex-col gap-5">
          <div>
            <h3 class="m-0 text-[18px] font-semibold text-[#171A1C]">Link ready</h3>
            <p class="m-0 mt-1 text-sm text-[#7B7B7B]">{{ linkIntro() }}</p>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[#171A1C]" for="brand-invite-link"
              >Invite link</label
            >
            <div class="flex flex-wrap items-center gap-2">
              <input
                pInputText
                id="brand-invite-link"
                type="text"
                readonly
                class="min-w-0 flex-1 !text-sm"
                [value]="link()"
                (focus)="selectAll($event)"
              />
              <button
                type="button"
                class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 px-4 text-sm font-medium text-white"
                [class]="copied() ? 'bg-[#16AC20]' : 'bg-[#171A1C]'"
                (click)="copyLink()"
              >
                @if (copied()) {
                  <svg data-p-icon="check" [size]="14" aria-hidden="true"></svg>
                  Copied
                } @else {
                  <svg data-p-icon="copy" [size]="14" aria-hidden="true"></svg>
                  Copy
                }
              </button>
            </div>
            @if (copyError()) {
              <p class="text-sm text-red-700">
                We could not reach your clipboard — select the link above and copy it by hand.
              </p>
            }
          </div>

          @if (whatsappUrl(); as url) {
            <a
              [href]="url"
              target="_blank"
              rel="noopener"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-medium text-white no-underline"
            >
              <svg data-p-icon="whatsapp" [size]="16" aria-hidden="true"></svg>
              Send on WhatsApp
            </a>
          }

          <!-- The other way to hand the link over: the platform mails it from
               hello@mail.clapoutcreators.com, and says where it landed. -->
          <form
            class="flex flex-col gap-2 border-t border-[#ECECEC] pt-4"
            novalidate
            [formGroup]="emailForm"
            (ngSubmit)="sendEmail()"
          >
            <label class="text-sm font-medium text-[#171A1C]" for="brand-invite-email-to"
              >Email the link</label
            >
            <div class="flex flex-wrap items-center gap-2">
              <input
                pInputText
                id="brand-invite-email-to"
                type="email"
                class="min-w-0 flex-1 !text-sm"
                placeholder="name@brand.com"
                formControlName="to"
                [attr.aria-invalid]="emailFieldError() ? 'true' : null"
              />
              <p-button
                type="submit"
                [label]="sendLabel()"
                styleClass="!rounded-lg !px-4 !py-2 !text-sm !shadow-none"
                [loading]="sendingEmail()"
                [disabled]="sendingEmail()"
              />
            </div>

            @if (emailFieldError(); as message) {
              <p class="text-sm text-red-700">{{ message }}</p>
            }
            @if (emailError(); as message) {
              <p class="text-sm text-red-700" role="alert">{{ message }}</p>
            }

            @if (created.emailSentAt && created.emailSentTo) {
              <p class="text-sm text-[#16AC20]" aria-live="polite">
                Sent to {{ created.emailSentTo }} · {{ sentLabel() }}
              </p>
            } @else if (emailWarning(); as warning) {
              <!-- The invite exists; only the automatic send failed, so this is
                   a warning with a retry above it, never an error state. -->
              <p-message severity="warn" [closable]="false">{{ warning }}</p-message>
            }
          </form>

          <div class="flex justify-end">
            <p-button
              label="Done"
              severity="secondary"
              styleClass="!rounded-lg !px-5 !py-2 !text-sm !shadow-none"
              (onClick)="close()"
            />
          </div>
        </div>
      } @else {
        <form class="flex flex-col gap-4" novalidate [formGroup]="form" (ngSubmit)="submit()">
          <p class="m-0 text-sm text-[#7B7B7B]">
            Everything here is a hint for the brand's own form — they can change any of it. Leave a
            field empty if you do not know it yet.
          </p>

          @if (errorMessage(); as message) {
            <p-message severity="error" [closable]="false">{{ message }}</p-message>
          }

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[#171A1C]" for="brand-invite-name"
              >Brand name</label
            >
            <input
              pInputText
              id="brand-invite-name"
              type="text"
              class="w-full"
              placeholder="MTN Ghana"
              formControlName="brandName"
            />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-[#171A1C]" for="brand-invite-contact"
                >Contact name</label
              >
              <input
                pInputText
                id="brand-invite-contact"
                type="text"
                class="w-full"
                placeholder="Ama Mensah"
                formControlName="contactName"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-[#171A1C]" for="brand-invite-email"
                >Email</label
              >
              <input
                pInputText
                id="brand-invite-email"
                type="email"
                class="w-full"
                placeholder="name@brand.com"
                formControlName="contactEmail"
                [attr.aria-invalid]="fieldError('contactEmail') ? 'true' : null"
              />
              @if (fieldError('contactEmail'); as message) {
                <p class="text-sm text-red-700">{{ message }}</p>
              }
            </div>
          </div>

          <!-- Only offered once there is somewhere to send to: an empty or
               half-typed address has no address to name in the label. -->
          @if (emailTarget(); as address) {
            <div class="flex items-start gap-[6px] rounded-lg bg-[#F9F9F9] px-3 py-2.5">
              <p-checkbox
                inputId="brand-invite-send-email"
                formControlName="sendEmail"
                class="mt-[2px] [&_.p-checkbox-box]:!h-4 [&_.p-checkbox-box]:!w-4 [&_.p-checkbox-box]:!rounded-[4px] [&_.p-checkbox-box]:!border-[#D7D7D7]"
                [binary]="true"
              />
              <label class="cursor-pointer text-sm text-[#333333]" for="brand-invite-send-email">
                Email the link to <span class="font-medium text-[#171A1C]">{{ address }}</span>
                right away
              </label>
            </div>
          }

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[#171A1C]" for="brand-invite-phone"
              >Phone number</label
            >
            <!-- Same country-code pairing as sign-up, so one WhatsApp-ready
                 international number comes out of two easy controls. -->
            <div class="flex items-center gap-2">
              <p-select
                ariaLabel="Country dialling code"
                class="shrink-0"
                optionLabel="label"
                optionValue="iso"
                formControlName="phoneCountry"
                [options]="phoneCodes"
              >
                <ng-template #selectedItem let-option>{{ option?.dialCode }}</ng-template>
              </p-select>
              <input
                pInputText
                id="brand-invite-phone"
                type="tel"
                inputmode="tel"
                class="min-w-0 flex-1"
                placeholder="020 123 4567"
                formControlName="phone"
              />
            </div>
            <p class="text-xs text-[#7B7B7B]">
              Used for the WhatsApp hand-off, e.g. +233 20 123 4567.
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[#171A1C]" for="brand-invite-website"
              >Website / social link</label
            >
            <input
              pInputText
              id="brand-invite-website"
              type="url"
              class="w-full"
              placeholder="https://brand.com"
              formControlName="website"
              [attr.aria-invalid]="fieldError('website') ? 'true' : null"
            />
            @if (fieldError('website'); as message) {
              <p class="text-sm text-red-700">{{ message }}</p>
            }
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[#171A1C]" for="brand-invite-expiry"
              >Link expires in</label
            >
            <p-select
              inputId="brand-invite-expiry"
              class="w-full"
              optionLabel="label"
              optionValue="value"
              formControlName="expiresInDays"
              [options]="expiryOptions"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[#171A1C]" for="brand-invite-note"
              >Internal note</label
            >
            <textarea
              pTextarea
              id="brand-invite-note"
              rows="3"
              class="w-full"
              placeholder="Who asked for this, what was agreed. The brand never sees this."
              formControlName="note"
            ></textarea>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <p-button
              type="button"
              label="Cancel"
              severity="secondary"
              [text]="true"
              styleClass="!rounded-lg !px-4 !py-2 !text-sm !shadow-none"
              (onClick)="close()"
            />
            <p-button
              type="submit"
              label="Create link"
              styleClass="!rounded-lg !px-5 !py-2 !text-sm !shadow-none"
              [loading]="saving()"
              [disabled]="saving()"
            />
          </div>
        </form>
      }
    </p-dialog>
  `,
})
export class BrandInviteDialog {
  readonly visible = model(false);
  /** Seeds the form each time the dialog opens. */
  readonly prefill = input<BrandInvitePrefill | null>(null);
  /**
   * Fires once the API has issued the invite — carrying the email fields when
   * `sendEmail` was ticked, since the API sends before it answers.
   */
  readonly created = output<BrandInvite>();
  /**
   * A manual send from the link state. Separate from {@link created} because
   * hosts hang more than a refresh off that one (the inquiry drawer re-reads
   * its row, since issuing an invite moves a NEW inquiry to CONTACTED) and a
   * resend changes nothing but this invite.
   */
  readonly emailed = output<BrandInvite>();

  private readonly admin = inject(AdminRepository);
  private readonly messages = inject(MessageService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly phoneCodes = PHONE_CODES;
  protected readonly expiryOptions = EXPIRY_OPTIONS;

  protected readonly form = this.formBuilder.group({
    brandName: [''],
    contactName: [''],
    contactEmail: ['', [Validators.email]],
    phoneCountry: [DEFAULT_PHONE_ISO],
    phone: [''],
    // A hint, not a URL field: inquiries arrive as "brand.com" or "@handle",
    // and the brand corrects it on their own form. Bare domains are normalised.
    website: [''],
    expiresInDays: [14],
    note: [''],
    // Only ever sent when there is a valid address to send to; the API ignores
    // it otherwise, but the payload should not claim something it cannot mean.
    sendEmail: [true],
  });

  /** The link state's own field, validated exactly like the one above it. */
  protected readonly emailForm = this.formBuilder.group({
    to: ['', [Validators.required, Validators.email]],
  });

  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly invite = signal<BrandInvite | null>(null);
  protected readonly copied = signal(false);
  protected readonly copyError = signal(false);
  protected readonly sendingEmail = signal(false);
  protected readonly emailSubmitted = signal(false);
  protected readonly emailError = signal('');
  /** `warning` from the create call: the invite exists, the auto-send did not. */
  protected readonly emailWarning = signal('');
  /** Mirrors the email control so the checkbox can appear as it is typed. */
  private readonly emailHint = signal('');
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  /** The platform composes the link; the API only ever returns the token. */
  protected readonly link = computed(() => {
    const invite = this.invite();
    return invite ? brandInviteLink(invite.token) : '';
  });

  protected readonly whatsappUrl = computed(() => {
    const invite = this.invite();
    if (!invite) {
      return null;
    }
    return whatsappShareUrl(invite.contactPhone, brandInviteMessage(this.link(), invite.brandName));
  });

  protected readonly expiryLabel = computed(() => {
    const invite = this.invite();
    if (!invite) {
      return '';
    }
    const days = Math.max(
      0,
      Math.round((new Date(invite.expiresAt).getTime() - Date.now()) / 86_400_000),
    );
    return days <= 1 ? 'tomorrow' : `in ${days} days`;
  });

  /** An address only becomes a target once it would actually pass validation. */
  protected readonly emailTarget = computed(() => {
    const value = this.emailHint().trim();
    return value && !this.form.controls.contactEmail.hasError('email') ? value : null;
  });

  /** Recomputed on every send, which is the only moment the age resets. */
  protected readonly sentLabel = computed(() => relativeTime(this.invite()?.emailSentAt));

  protected readonly sendLabel = computed(() =>
    this.invite()?.emailSentAt ? 'Send again' : 'Send email',
  );

  protected readonly linkIntro = computed(() => {
    const invite = this.invite();
    if (!invite) {
      return '';
    }
    const expiry = `Single use, expires ${this.expiryLabel()}.`;
    return invite.emailSentAt
      ? `${expiry} It is already on its way — send it again or share the link yourself.`
      : `${expiry} Email it below, or send the link to ${invite.contactName || 'the brand'} yourself.`;
  });

  constructor() {
    // Opening is always a fresh start: a stale link from the previous invite
    // must never be the thing the admin copies. Only the open/close transition
    // may trigger it: `reset()` reads `prefill`, and hosts refresh their prefill
    // right after `created` fires (the inquiry drawer re-reads the row to show
    // CONTACTED). Tracking that read would wipe the link state the moment it
    // appeared.
    effect(() => {
      const visible = this.visible();
      untracked(() => {
        if (visible) {
          this.reset();
        }
      });
    });

    // The checkbox appears and names its address as the admin types, so the
    // control's value has to reach a signal.
    this.form.controls.contactEmail.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.emailHint.set(value ?? ''));
  }

  protected fieldError(field: string): string | null {
    return firstErrorMessage(this.form.get(field), MESSAGES[field] ?? {}, this.submitted());
  }

  protected emailFieldError(): string | null {
    return firstErrorMessage(this.emailForm.controls.to, MESSAGES['to'], this.emailSubmitted());
  }

  protected close(): void {
    this.visible.set(false);
  }

  protected selectAll(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  protected async copyLink(): Promise<void> {
    const link = this.link();
    if (!link) {
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      this.copyError.set(false);
      this.copied.set(true);
      if (this.copiedTimer !== null) {
        clearTimeout(this.copiedTimer);
      }
      this.copiedTimer = setTimeout(() => this.copied.set(false), COPIED_FEEDBACK_MS);
      this.messages.add({
        severity: 'success',
        summary: 'Link copied',
        detail: 'Paste it into WhatsApp or an email to the brand.',
      });
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission);
      // the link is on screen and selectable, so say so rather than failing mute.
      this.copyError.set(true);
      this.messages.add({
        severity: 'warn',
        summary: 'Could not copy',
        detail: 'Select the link and copy it by hand.',
      });
    }
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    try {
      const { invite, warning } = await this.admin.createBrandInvite(this.buildPayload());
      this.applyInvite(invite);
      // A refused auto-send is reported beside the resend button, not thrown:
      // the link exists and is the point of the dialog.
      this.emailWarning.set(warning?.message ?? '');
      this.created.emit(invite);
      this.messages.add({
        severity: 'success',
        summary: 'Invite created',
        detail: invite.emailSentTo
          ? `The link is on its way to ${invite.emailSentTo}.`
          : invite.brandName
            ? `${invite.brandName} can now set themselves up.`
            : 'Send the link to the brand.',
      });
    } catch (error) {
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not create this invite.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * `POST /admin/brand-invites/:id/send-email`. The address in the field wins,
   * so a typo caught after the fact is fixed by correcting it and sending
   * again rather than by starting a second invite.
   */
  protected async sendEmail(): Promise<void> {
    const invite = this.invite();
    this.emailSubmitted.set(true);
    if (!invite || this.emailForm.invalid || this.sendingEmail()) {
      this.emailForm.markAllAsTouched();
      return;
    }
    const address = this.emailForm.controls.to.value.trim();
    this.sendingEmail.set(true);
    this.emailError.set('');
    try {
      const updated = await this.admin.sendBrandInviteEmail(invite.id, address);
      this.applyInvite(updated);
      this.emailWarning.set('');
      this.emailed.emit(updated);
      this.messages.add({
        severity: 'success',
        summary: 'Email sent',
        detail: `The invite link is on its way to ${updated.emailSentTo ?? address}.`,
      });
    } catch (error) {
      this.emailError.set(brandInviteEmailError(error));
    } finally {
      this.sendingEmail.set(false);
    }
  }

  /**
   * Keeps the address field pointing at wherever the invite last went, so
   * "Send again" repeats the send the admin can see rather than the hint the
   * invite was created with.
   */
  private applyInvite(invite: BrandInvite): void {
    this.invite.set(invite);
    this.emailForm.reset({ to: invite.emailSentTo ?? invite.contactEmail ?? '' });
    this.emailSubmitted.set(false);
    this.emailError.set('');
  }

  /** Empty strings are dropped: the API stores "unknown" as null, not ''. */
  private buildPayload() {
    const value = this.form.getRawValue();
    const phone = toInternationalPhone(dialCodeFor(value.phoneCountry), value.phone);
    const prefill = this.prefill();
    return {
      brandName: value.brandName.trim() || null,
      contactName: value.contactName.trim() || null,
      contactEmail: value.contactEmail.trim() || null,
      contactPhone: phone || null,
      website: normaliseWebsiteHint(value.website) || null,
      note: value.note.trim() || null,
      expiresInDays: value.expiresInDays,
      ...(prefill?.inquiryId ? { inquiryId: prefill.inquiryId } : {}),
      ...(value.sendEmail && this.emailTarget() ? { sendEmail: true } : {}),
    };
  }

  private reset(): void {
    const prefill = this.prefill();
    const phone = splitInternationalPhone(prefill?.contactPhone);
    this.form.reset({
      brandName: prefill?.brandName?.trim() ?? '',
      contactName: prefill?.contactName?.trim() ?? '',
      contactEmail: prefill?.contactEmail?.trim() ?? '',
      phoneCountry: phone.iso,
      phone: phone.local,
      website: normaliseWebsiteHint(prefill?.website),
      expiresInDays: 14,
      note: '',
      sendEmail: true,
    });
    this.emailForm.reset({ to: '' });
    this.invite.set(null);
    this.submitted.set(false);
    this.errorMessage.set('');
    this.copied.set(false);
    this.copyError.set(false);
    this.emailSubmitted.set(false);
    this.emailError.set('');
    this.emailWarning.set('');
  }
}
