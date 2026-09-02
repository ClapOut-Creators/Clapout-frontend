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
import { firstErrorMessage } from '../../shared/components/form-errors';

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
    const fallback = this.auth.isAdmin() ? '/admin/dashboard' : '/creator/dashboard';
    await this.router.navigateByUrl(this.returnUrl() || fallback);
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
    try {
      const { email, password, rememberMe } = this.form.getRawValue();
      const user = await this.auth.signIn({ email, password }, rememberMe);
      const home = user.role === 'ADMIN' ? '/admin/dashboard' : '/creator/dashboard';
      await this.router.navigateByUrl(this.returnUrl() || home);
    } catch (error) {
      this.errorMessage.set(
        error instanceof ApiError
          ? error.code === 'INVALID_CREDENTIALS'
            ? 'That email and password combination did not match an account.'
            : error.message
          : 'We could not sign you in. Please try again.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
