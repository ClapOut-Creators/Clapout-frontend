import { Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Check } from '@primeicons/angular/check';
import { ExternalLink } from '@primeicons/angular/external-link';
import { Image as ImageIcon } from '@primeicons/angular/image';
import { Times } from '@primeicons/angular/times';
import { Video } from '@primeicons/angular/video';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { ApiError } from '../../core/api/api-error';
import { CampaignsRepository } from '../../core/data/campaigns-repository';
import { RegistrationsRepository } from '../../core/data/registrations-repository';
import { SubmissionsRepository } from '../../core/data/submissions-repository';
import { CampaignPlatform, PublicCampaign } from '../../core/models/campaign';
import { Registration } from '../../core/models/registration';
import { Submission } from '../../core/models/submission';
import {
  formatDate,
  formatMoneyExact,
  NOT_ANNOUNCED,
  platformLabel,
  registrationStatusLabel,
} from '../../core/util/campaign-format';
import {
  isPlatformPostUrl,
  platformHostHint,
  platformMismatchMessage,
  platformPostPlaceholder,
  postUrlLabel,
  submissionsOpen,
} from '../../core/util/platform-url';
import { firstErrorMessage, httpUrlValidator } from '../../shared/forms/form-errors';
import {
  formatBytes,
  resizeImageToDataUrl,
  screenshotFileError,
} from '../../shared/forms/image-resize';
import { SubmissionList } from '../../shared/creator/submission-list';

type SubmitState = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * Why the form is not being shown. Every one of these is an explanatory panel
 * with a way forward, never a silent redirect.
 */
export type SubmitBlock = 'not-registered' | 'pending' | 'rejected' | 'campaign-closed' | null;

export const MAX_CAPTION = 200;
export const MAX_NOTE = 2000;

const MESSAGES: Record<string, Record<string, string>> = {
  postUrl: {
    required: 'Paste the link to the clip you posted.',
    url: 'Enter a full URL, starting with https://',
    platform: 'That link is not on the platform you registered with.',
  },
  screenshotUrl: { required: 'Add a screenshot of the post or its analytics.' },
  claimedViews: {
    min: 'Views cannot be negative.',
    integer: 'Enter a whole number of views.',
  },
  caption: { maxlength: `Keep the caption under ${MAX_CAPTION} characters.` },
  note: { maxlength: `Keep your note under ${MAX_NOTE} characters.` },
  confirm: { required: 'Confirm the clip follows the campaign requirements.' },
};

/** Rejects 1.5 without rejecting an empty field. */
const integerValidator = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return Number.isInteger(value) ? null : { integer: true };
};

/**
 * Turns a failed `POST /submissions` into copy the clipper can act on. Pure, so
 * the mapping is unit-tested without standing up the component.
 */
export function submissionErrorMessage(error: unknown, platform: CampaignPlatform | null): string {
  if (!(error instanceof ApiError)) {
    return 'We could not submit your clip. Please try again.';
  }
  switch (error.code) {
    case 'REGISTRATION_NOT_ACCEPTED':
      return 'Your application for this campaign has not been accepted yet, so clips cannot be submitted.';
    case 'SUBMISSIONS_CLOSED':
      return 'This campaign is no longer running, so it is not accepting clips.';
    case 'POST_URL_PLATFORM_MISMATCH':
      return platform
        ? platformMismatchMessage(platform)
        : 'That link is not on the platform you registered with.';
    case 'DUPLICATE_SUBMISSION':
      return 'This clip has already been submitted.';
    case 'REGISTRATION_NOT_FOUND':
      return 'We could not find your registration for this campaign. Reload the page and try again.';
    case 'VALIDATION':
      return error.message;
    default:
      return error.message;
  }
}

/**
 * "Submit your clip" (`/creator/campaigns/:slug/submit`).
 *
 * Loads the campaign and the clipper's registration for it, then either shows
 * the submission form or the panel that explains why it cannot: no
 * registration, an application still in review, a rejected application, or a
 * campaign that is not ACTIVE.
 *
 * There is no Figma board for this screen, so it borrows the clipper
 * dashboard's language: white `rounded-[18.8px]` panels on `#ECECEC`, `#2B2B2B`
 * headings over `#808080` body copy, 50px pill buttons and the orange→amber
 * gradient for the primary action.
 */
@Component({
  imports: [
    ButtonModule,
    Check,
    CheckboxModule,
    DatePickerModule,
    ExternalLink,
    ImageIcon,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    RouterLink,
    SkeletonModule,
    SubmissionList,
    TextareaModule,
    Times,
    Video,
  ],
  selector: 'app-submit-clip',
  templateUrl: './submit-clip.html',
})
export class SubmitClip {
  /** Bound from the `:slug` route parameter via `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  private readonly campaigns = inject(CampaignsRepository);
  private readonly registrations = inject(RegistrationsRepository);
  private readonly submissions = inject(SubmissionsRepository);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly messages = inject(MessageService);
  private readonly confirmations = inject(ConfirmationService);

  protected readonly state = signal<SubmitState>('loading');
  protected readonly campaign = signal<PublicCampaign | null>(null);
  protected readonly registration = signal<Registration | null>(null);
  protected readonly loadErrorMessage = signal('');
  protected readonly submitErrorMessage = signal('');
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  /** Set once the API accepted a clip; swaps the page to the success panel. */
  protected readonly justSubmitted = signal<Submission | null>(null);

  protected readonly screenshotError = signal('');
  protected readonly resizing = signal(false);
  protected readonly dragging = signal(false);

  protected readonly mine = signal<Submission[]>([]);
  protected readonly mineError = signal('');
  protected readonly withdrawingIds = signal<ReadonlySet<string>>(new Set<string>());

  protected readonly maxCaption = MAX_CAPTION;
  protected readonly maxNote = MAX_NOTE;
  protected readonly notAnnounced = NOT_ANNOUNCED;
  protected readonly formatDate = formatDate;
  protected readonly formatMoneyExact = formatMoneyExact;
  protected readonly platformLabel = platformLabel;
  protected readonly registrationStatusLabel = registrationStatusLabel;
  /** `p-datepicker` should never offer a future posting date. */
  protected readonly today = new Date();

  protected readonly form = this.formBuilder.group({
    postUrl: [
      '',
      [
        Validators.required,
        httpUrlValidator,
        (control: AbstractControl) => this.platformError(control),
      ],
    ],
    screenshotUrl: ['', [Validators.required]],
    claimedViews: this.formBuilder.control<number | null>(null, [
      Validators.min(0),
      integerValidator,
    ]),
    postedAt: this.formBuilder.control<Date | null>(new Date()),
    caption: ['', [Validators.maxLength(MAX_CAPTION)]],
    note: ['', [Validators.maxLength(MAX_NOTE)]],
    confirm: [false, [Validators.requiredTrue]],
  });

  protected readonly platform = computed(() => this.registration()?.platform ?? null);

  protected readonly block = computed<SubmitBlock>(() => {
    const campaign = this.campaign();
    const registration = this.registration();
    if (!campaign) {
      return null;
    }
    if (!registration) {
      return 'not-registered';
    }
    if (registration.status === 'REJECTED') {
      return 'rejected';
    }
    if (registration.status !== 'ACCEPTED') {
      return 'pending';
    }
    return submissionsOpen(campaign.status) ? null : 'campaign-closed';
  });

  protected readonly canSubmit = computed(() => this.state() === 'ready' && this.block() === null);

  protected readonly platformHint = computed(() => {
    const platform = this.platform();
    return platform ? platformHostHint(platform) : '';
  });

  protected readonly postUrlPlaceholder = computed(() => {
    const platform = this.platform();
    return platform ? platformPostPlaceholder(platform) : 'https://';
  });

  protected readonly reviewHint = computed(() => {
    const time = this.campaign()?.avgReviewTime?.trim();
    return time
      ? `We review clips on this campaign in about ${time}.`
      : 'We will review it and get back to you.';
  });

  /** Tail of the "your application is Submitted…" sentence in the pending panel. */
  protected readonly reviewSuffix = computed(() => {
    const time = this.campaign()?.avgReviewTime?.trim();
    return time ? `, and reviews usually take about ${time}.` : '.';
  });

  /** The registered profile link, shortened to fit one line. */
  protected readonly accountLabel = computed(() =>
    postUrlLabel(this.registration()?.accountUrl ?? '', 46),
  );

  /** Rough transferred size of the resized screenshot, e.g. '184 KB'. */
  protected readonly screenshotSizeLabel = computed(() => {
    const value = this.form.controls.screenshotUrl.value;
    return value ? formatBytes(Math.round((value.length * 3) / 4)) : '';
  });

  constructor() {
    effect(() => {
      void this.load(this.slug());
    });
  }

  protected reload(): void {
    void this.load(this.slug());
  }

  protected fieldError(field: keyof typeof MESSAGES): string | null {
    return firstErrorMessage(this.form.get(field), MESSAGES[field], this.submitted());
  }

  /** The wrong-platform message is written per platform, so it is resolved late. */
  protected postUrlErrorMessage(): string | null {
    const control = this.form.controls.postUrl;
    if (control.hasError('platform') && (control.touched || this.submitted())) {
      const platform = this.platform();
      return platform ? platformMismatchMessage(platform) : MESSAGES['postUrl']['platform'];
    }
    return this.fieldError('postUrl');
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
    this.screenshotError.set('');
    this.form.controls.screenshotUrl.setValue('');
    this.form.controls.screenshotUrl.markAsTouched();
  }

  private async acceptFile(file: File): Promise<void> {
    const rejection = screenshotFileError(file);
    if (rejection) {
      this.screenshotError.set(rejection);
      return;
    }

    this.screenshotError.set('');
    this.resizing.set(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      this.form.controls.screenshotUrl.setValue(dataUrl);
      this.form.controls.screenshotUrl.markAsDirty();
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      this.screenshotError.set(
        reason === 'too-large'
          ? 'We could not shrink that image enough. Try a cropped screenshot instead.'
          : 'We could not read that image. Try another screenshot.',
      );
    } finally {
      this.resizing.set(false);
    }
  }

  // ---------------------------------------------------------------- submit

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.submitErrorMessage.set('');

    const registration = this.registration();
    if (!registration || this.submitting() || !this.canSubmit()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitting.set(true);
    try {
      const created = await this.submissions.create({
        registrationId: registration.id,
        postUrl: value.postUrl.trim(),
        screenshotUrl: value.screenshotUrl,
        ...(value.caption.trim() ? { caption: value.caption.trim() } : {}),
        ...(value.claimedViews !== null ? { claimedViews: value.claimedViews } : {}),
        ...(value.postedAt ? { postedAt: toIsoDate(value.postedAt) } : {}),
        ...(value.note.trim() ? { note: value.note.trim() } : {}),
      });
      this.justSubmitted.set(created);
      this.messages.add({
        severity: 'success',
        summary: 'Clip submitted',
        detail: 'It is now waiting for review.',
      });
      void this.loadMine(registration.id);
    } catch (error) {
      this.submitErrorMessage.set(submissionErrorMessage(error, this.platform()));
    } finally {
      this.submitting.set(false);
    }
  }

  /** "Submit another clip" — back to an empty form, same campaign. */
  protected submitAnother(): void {
    this.justSubmitted.set(null);
    this.submitted.set(false);
    this.submitErrorMessage.set('');
    this.screenshotError.set('');
    this.form.reset({
      postUrl: '',
      screenshotUrl: '',
      claimedViews: null,
      postedAt: new Date(),
      caption: '',
      note: '',
      confirm: false,
    });
  }

  protected confirmWithdraw(submission: Submission): void {
    this.confirmations.confirm({
      header: 'Withdraw this clip?',
      message:
        'It will be removed from the review queue. You can submit the same clip again afterwards.',
      acceptLabel: 'Withdraw clip',
      rejectLabel: 'Keep it',
      accept: () => void this.withdraw(submission),
    });
  }

  private async withdraw(submission: Submission): Promise<void> {
    this.withdrawingIds.update((ids) => new Set(ids).add(submission.id));
    try {
      await this.submissions.remove(submission.id);
      this.mine.update((rows) => rows.filter((row) => row.id !== submission.id));
      this.messages.add({ severity: 'success', summary: 'Clip withdrawn' });
    } catch (error) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not withdraw that clip',
        detail:
          error instanceof ApiError && error.code === 'SUBMISSION_LOCKED'
            ? 'A reviewer has already picked it up, so it can no longer be withdrawn.'
            : error instanceof ApiError
              ? error.message
              : 'Please try again in a moment.',
      });
    } finally {
      this.withdrawingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(submission.id);
        return next;
      });
    }
  }

  // ------------------------------------------------------------------ load

  private platformError(control: AbstractControl): ValidationErrors | null {
    const platform = this.registration()?.platform;
    if (!platform || typeof control.value !== 'string' || !control.value.trim()) {
      return null;
    }
    return isPlatformPostUrl(platform, control.value) ? null : { platform: true };
  }

  private async load(slug: string): Promise<void> {
    this.state.set('loading');
    this.justSubmitted.set(null);
    this.submitErrorMessage.set('');
    this.mine.set([]);

    try {
      const campaign = await this.campaigns.bySlug(slug);
      this.campaign.set(campaign);
    } catch (error) {
      this.campaign.set(null);
      if (error instanceof ApiError && error.isNotFound) {
        this.state.set('not-found');
        return;
      }
      this.loadErrorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load this campaign.',
      );
      this.state.set('error');
      return;
    }

    try {
      const mine = await this.registrations.listMine();
      const registration = mine.find((item) => item.campaign.slug === slug) ?? null;
      this.registration.set(registration);
      // The post-URL check depends on the registered platform, which only
      // arrives now; re-run it so a link typed before the load is still judged.
      this.form.controls.postUrl.updateValueAndValidity({ emitEvent: false });
      this.state.set('ready');
      if (registration) {
        void this.loadMine(registration.id);
      }
    } catch (error) {
      this.registration.set(null);
      this.loadErrorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load your registration.',
      );
      this.state.set('error');
    }
  }

  /** The previous-clips list is supporting detail: a failure is inline, not fatal. */
  private async loadMine(registrationId: string): Promise<void> {
    this.mineError.set('');
    try {
      this.mine.set(await this.submissions.listMine(registrationId));
    } catch (error) {
      this.mine.set([]);
      this.mineError.set(
        error instanceof ApiError ? error.message : 'We could not load your previous clips.',
      );
    }
  }
}

/** Local calendar date as 'YYYY-MM-DD' — `toISOString()` would shift the day. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
