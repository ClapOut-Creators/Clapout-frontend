import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Lock } from '@primeicons/angular/lock';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { ONBOARDING_PATH } from '../../core/auth/onboarding-guard';
import {
  isChunkLoadError,
  NEXT_PAGE_FAILED_MESSAGE,
  reloadForFreshBundle,
} from '../../core/routing/chunk-reload';
import { firstErrorMessage } from '../../shared/forms/form-errors';

const MESSAGES: Record<string, Record<string, string>> = {
  email: {
    required: 'Enter the email address you signed up with.',
    email: 'Enter a valid email address.',
  },
  password: { required: 'Enter your password.' },
};

@Component({
  imports: [
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    Lock,
    MessageModule,
    PasswordModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  selector: 'app-sign-in',
  templateUrl: './sign-in.html',
})
export class SignIn {
  /** Bound from `?returnUrl=` via `withComponentInputBinding()`. */
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  constructor() {
    // A signed-in visitor landing here should go where they belong, not stare
    // at a form they don't need.
    void this.redirectIfSignedIn();
  }

  private async redirectIfSignedIn(): Promise<void> {
    await this.auth.whenSessionReady();
    if (!this.auth.isSignedIn()) {
      return;
    }
    await this.router.navigateByUrl(this.landing());
  }

  /**
   * Where a signed-in session goes from here. A clipper with setup steps left
   * (email unverified, or the community not yet confirmed) goes to the
   * onboarding page first, with any requested page waiting in `returnUrl`;
   * the onboarding page is chromeless, so the rail stays out of sight until
   * the steps are done. Everyone else gets the page they asked for, or their
   * dashboard.
   */
  private landing(): string {
    const returnUrl = this.returnUrl();
    if (this.auth.needsOnboarding()) {
      return returnUrl
        ? `${ONBOARDING_PATH}?returnUrl=${encodeURIComponent(returnUrl)}`
        : ONBOARDING_PATH;
    }
    return returnUrl || (this.auth.isAdmin() ? '/admin/dashboard' : '/creator/dashboard');
  }

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string>('');

  protected fieldError(field: 'email' | 'password'): string | null {
    return firstErrorMessage(this.form.controls[field], MESSAGES[field], this.submitted());
  }

  protected signUpLink(): unknown[] {
    return ['/auth/sign-up'];
  }

  protected signUpQuery(): Record<string, string> {
    const target = this.returnUrl();
    return target ? { returnUrl: target } : {};
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    let target: string;
    try {
      const { email, password, rememberMe } = this.form.getRawValue();
      await this.auth.signIn({ email, password }, rememberMe);
      target = this.landing();
    } catch (error) {
      this.errorMessage.set(
        error instanceof ApiError
          ? error.code === 'INVALID_CREDENTIALS'
            ? 'That email and password combination did not match an account.'
            : error.message
          : 'We could not sign you in. Please try again.',
      );
      this.submitting.set(false);
      return;
    }

    // Signed in. Anything that fails from here is the next page not loading —
    // usually a stale bundle after a deploy — and must not read as a
    // credentials problem.
    try {
      await this.router.navigateByUrl(target);
    } catch (error) {
      if (isChunkLoadError(error) && reloadForFreshBundle(target)) {
        return; // the page is reloading with a fresh bundle
      }
      this.errorMessage.set(NEXT_PAGE_FAILED_MESSAGE);
    } finally {
      this.submitting.set(false);
    }
  }
}
