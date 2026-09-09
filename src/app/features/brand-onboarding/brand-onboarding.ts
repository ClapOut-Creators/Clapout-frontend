import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { ArrowRight } from '@primeicons/angular/arrow-right';
import { Check } from '@primeicons/angular/check';
import { Spinner } from '@primeicons/angular/spinner';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiError } from '../../core/api/api-error';
import { BrandInvitesRepository } from '../../core/data/brand-invites-repository';
import { BrandInviteStatus, PublicBrandInvite } from '../../core/models/brand-invite';
import { CLAPOUT_CONTACT_EMAIL } from '../../core/util/brand-invite-link';
import { formatDate } from '../../core/util/campaign-format';
import {
  BrandForm,
  BrandFormValue,
  BRAND_FORM_LAST_STEP,
  BRAND_FORM_STEPS,
} from '../../shared/brands/brand-form';

type OnboardingState = 'loading' | 'invalid' | 'closed' | 'error' | 'form' | 'saved';

/**
 * What a failed `POST /public/brand-invites/:token/complete` means for the
 * page: a field-level complaint, a link that has just died under the rep, a
 * link that never existed, or a banner they can retry through.
 */
export type CompleteFailure =
  | { kind: 'name'; message: string }
  | { kind: 'closed'; status: BrandInviteStatus | null; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'banner'; message: string };

const BRAND_EXISTS_MESSAGE =
  "A brand with this name already exists on ClapOut — contact us and we'll link you to it.";

/**
 * Maps a completion failure onto the state the page should move to.
 *
 * The 410 family is the interesting one: the link was PENDING when the page
 * loaded and stopped being so while the rep was typing (an admin revoked it,
 * the expiry passed, or a second tab got there first), so the page has to stop
 * being a form and start explaining. A 410 whose code we do not recognise
 * still gets the dead-link screen, just without naming a reason.
 */
export function brandInviteCompleteFailure(error: unknown): CompleteFailure {
  if (!(error instanceof ApiError)) {
    return { kind: 'banner', message: 'We could not save your brand. Please try again.' };
  }

  if (error.status === 409 || error.code === 'BRAND_EXISTS') {
    return { kind: 'name', message: BRAND_EXISTS_MESSAGE };
  }

  if (error.status === 410) {
    switch (error.code) {
      case 'INVITE_USED':
        return { kind: 'closed', status: 'COMPLETED', message: error.message };
      case 'INVITE_REVOKED':
        return { kind: 'closed', status: 'REVOKED', message: error.message };
      case 'INVITE_EXPIRED':
        return { kind: 'closed', status: 'EXPIRED', message: error.message };
      default:
        return { kind: 'closed', status: null, message: error.message };
    }
  }

  if (error.status === 404) {
    return { kind: 'invalid', message: error.message };
  }

  if (error.status === 429) {
    return { kind: 'banner', message: 'Too many attempts. Please try again in a few minutes.' };
  }

  if (error.status === 422) {
    return {
      kind: 'banner',
      message: error.message || 'Some of these details were not accepted. Please check them.',
    };
  }

  return {
    kind: 'banner',
    message: error.isNetworkError
      ? error.message
      : error.message || 'We could not save your brand. Please try again.',
  };
}

/**
 * `/brand/onboard/:token` — the public, chromeless page a brand's own
 * representative lands on from the link an admin sent them. No guard and no
 * session: the token in the URL is the whole credential.
 *
 * The three steps are the admin brand wizard's, unchanged
 * (`shared/brands/brand-form`); what differs is the shell around them, the
 * submit target (`POST /public/brand-invites/:token/complete`) and a success
 * screen with nothing admin-shaped on it.
 */
@Component({
  imports: [ArrowRight, BrandForm, ButtonModule, Check, MessageModule, SkeletonModule, Spinner],
  selector: 'app-brand-onboarding',
  templateUrl: './brand-onboarding.html',
})
export class BrandOnboarding {
  /** The invite token from the link. */
  readonly token = input.required<string>();

  private readonly invites = inject(BrandInvitesRepository);
  private readonly brandForm = viewChild(BrandForm);

  protected readonly steps = BRAND_FORM_STEPS;
  protected readonly lastStep = BRAND_FORM_LAST_STEP;
  protected readonly contactEmail = CLAPOUT_CONTACT_EMAIL;
  protected readonly contactHref = `mailto:${CLAPOUT_CONTACT_EMAIL}?subject=${encodeURIComponent(
    'My ClapOut brand link',
  )}`;

  protected readonly state = signal<OnboardingState>('loading');
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly nameError = signal('');
  protected readonly loadErrorMessage = signal('');
  protected readonly prefill = signal<Partial<BrandFormValue> | null>(null);
  protected readonly invite = signal<PublicBrandInvite | null>(null);
  /** Why the link is dead, when we know; null keeps the copy generic. */
  protected readonly closedStatus = signal<BrandInviteStatus | null>(null);
  protected readonly savedBrandName = signal('');

  protected readonly currentStep = computed(() => BRAND_FORM_STEPS[this.step()]);
  protected readonly progressPercent = computed(() =>
    Math.min(100, ((this.step() + 1) / BRAND_FORM_STEPS.length) * 100),
  );

  /** Heading for the dead-link screen. */
  protected readonly closedTitle = computed(() => {
    switch (this.closedStatus()) {
      case 'COMPLETED':
        return 'This link has already been used';
      case 'REVOKED':
        return 'This link was cancelled';
      case 'EXPIRED':
        return 'This link has expired';
      default:
        return 'This link is no longer active';
    }
  });

  /** The explanation under it — written for the brand, not for the contract. */
  protected readonly closedMessage = computed(() => {
    const invite = this.invite();
    switch (this.closedStatus()) {
      case 'COMPLETED': {
        const brand = invite?.completedBrandName?.trim();
        return brand
          ? `${brand} has already been set up with this link, so it only works once.`
          : 'A brand has already been set up with this link, so it only works once.';
      }
      case 'REVOKED':
        return 'Someone at ClapOut cancelled this invite. We can send you a fresh link.';
      case 'EXPIRED':
        return invite?.expiresAt
          ? `This link expired on ${formatDate(invite.expiresAt)}. We can send you a fresh one.`
          : 'This link has expired. We can send you a fresh one.';
      default:
        return 'This link can no longer be used. We can send you a fresh one.';
    }
  });

  constructor() {
    effect(() => {
      const token = this.token();
      if (token) {
        void this.load(token);
      }
    });
  }

  // ------------------------------------------------------------ navigation

  protected back(): void {
    this.brandForm()?.clearSubmitted();
    this.errorMessage.set('');
    this.step.update((step) => Math.max(0, step - 1));
  }

  protected onSubmit(): void {
    const form = this.brandForm();
    if (!form || !form.validateStep(this.step())) {
      return;
    }
    if (this.step() < BRAND_FORM_LAST_STEP) {
      form.clearSubmitted();
      this.errorMessage.set('');
      this.step.update((step) => step + 1);
      return;
    }
    void this.save();
  }

  protected retry(): void {
    void this.load(this.token());
  }

  // ------------------------------------------------------------------ data

  private async load(token: string): Promise<void> {
    this.state.set('loading');
    this.loadErrorMessage.set('');
    try {
      const invite = await this.invites.byToken(token);
      this.invite.set(invite);
      if (invite.status !== 'PENDING') {
        this.closedStatus.set(invite.status);
        this.state.set('closed');
        return;
      }
      this.prefill.set({
        name: invite.brandName ?? '',
        website: invite.website ?? '',
        contactName: invite.contactName ?? '',
        contactEmail: invite.contactEmail ?? '',
        contactPhone: invite.contactPhone ?? '',
      });
      this.state.set('form');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        this.state.set('invalid');
        return;
      }
      if (error instanceof ApiError && error.status === 429) {
        this.loadErrorMessage.set('Too many attempts. Please try again in a few minutes.');
        this.state.set('error');
        return;
      }
      this.loadErrorMessage.set(
        error instanceof ApiError ? error.message : 'We could not open your invite.',
      );
      this.state.set('error');
    }
  }

  private async save(): Promise<void> {
    const form = this.brandForm();
    if (!form || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.nameError.set('');
    try {
      const result = await this.invites.complete(this.token(), form.value());
      this.savedBrandName.set(result.brand.name);
      this.invite.set(result.invite);
      form.form.markAsPristine();
      this.state.set('saved');
    } catch (error) {
      this.applyFailure(error);
    } finally {
      this.saving.set(false);
    }
  }

  private applyFailure(error: unknown): void {
    const failure = brandInviteCompleteFailure(error);
    switch (failure.kind) {
      case 'name':
        this.nameError.set(failure.message);
        this.brandForm()?.flagNameConflict();
        this.step.set(0);
        return;
      case 'closed':
        this.closedStatus.set(failure.status);
        this.state.set('closed');
        return;
      case 'invalid':
        this.state.set('invalid');
        return;
      default:
        this.errorMessage.set(failure.message);
    }
  }
}
