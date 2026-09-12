import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { ONBOARDING_PATH } from '../../core/auth/onboarding-guard';
import { RESEND_COOLDOWN_SECONDS } from '../../shared/creator/onboarding-stepper';

/**
 * 'verifying' while the token is being redeemed; 'success' once the address
 * is confirmed; 'invalid' for an unknown, used or expired link; 'missing'
 * when the URL carried no token at all; 'error' for anything else.
 */
type VerifyState = 'verifying' | 'success' | 'invalid' | 'missing' | 'error';

/**
 * `/auth/verify-email?token=…` — where the link in the verification email
 * lands. The page redeems the token with a POST (so a mail scanner that
 * prefetches links cannot use it up), then sends the creator on: into
 * onboarding when they are signed in here, otherwise to sign-in.
 *
 * A dead link offers a resend when the signed-in account is the unverified
 * one; anyone else is pointed at sign-in, from where onboarding resends.
 */
@Component({
  imports: [ButtonModule, MessageModule, RouterLink],
  selector: 'app-verify-email',
  templateUrl: './verify-email.html',
})
export class VerifyEmail implements OnInit {
  /** Bound from `?token=` via `withComponentInputBinding()`. */
  readonly token = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<VerifyState>('verifying');
  protected readonly errorMessage = signal('');
  /** The address that was just confirmed, for the success copy. */
  protected readonly verifiedEmail = signal('');

  protected readonly signedIn = this.auth.isSignedIn;
  /** The signed-in account still needs verifying, so a fresh link can be sent from here. */
  protected readonly canResend = computed(
    () => this.auth.isSignedIn() && !this.auth.emailVerified(),
  );
  protected readonly resending = signal(false);
  protected readonly resendCooldown = signal(0);
  protected readonly resendNotice = signal('');
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  /** Signed in: straight into the remaining onboarding steps. Otherwise sign in first. */
  protected readonly continuePath = computed(() =>
    this.auth.isSignedIn() ? ONBOARDING_PATH : '/auth/sign-in',
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.stopCooldown());
  }

  ngOnInit(): void {
    void this.redeem();
  }

  private async redeem(): Promise<void> {
    const token = this.token()?.trim();
    if (!token) {
      this.state.set('missing');
      return;
    }
    // The session must be known first, so the success page can tell a
    // signed-in creator from a visitor opening the link on another device.
    await this.auth.whenSessionReady();
    try {
      const user = await this.auth.verifyEmail(token);
      this.verifiedEmail.set(user.email);
      this.state.set('success');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_VERIFICATION_TOKEN') {
        this.state.set('invalid');
        return;
      }
      this.errorMessage.set(
        error instanceof ApiError && !error.isNetworkError
          ? error.message
          : 'We could not reach ClapOut. Check your connection and reload this page.',
      );
      this.state.set('error');
    }
  }

  protected async resend(): Promise<void> {
    if (this.resending() || this.resendCooldown() > 0) {
      return;
    }
    this.resendNotice.set('');
    this.errorMessage.set('');
    this.resending.set(true);
    try {
      const result = await this.auth.resendVerification();
      if (result.alreadyVerified) {
        await this.router.navigateByUrl(ONBOARDING_PATH);
        return;
      }
      this.resendNotice.set(
        result.sent
          ? 'A new link is on its way. Check your inbox and spam folder.'
          : 'We could not send the email right now. Please try again in a minute.',
      );
      this.startCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'We could not send a new link. Please try again.';
      this.errorMessage.set(message);
      if (error instanceof ApiError && error.code === 'VERIFICATION_COOLDOWN') {
        this.startCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      this.resending.set(false);
    }
  }

  private startCooldown(seconds: number): void {
    this.stopCooldown();
    this.resendCooldown.set(seconds);
    this.cooldownTimer = setInterval(() => {
      const left = this.resendCooldown() - 1;
      this.resendCooldown.set(Math.max(0, left));
      if (left <= 0) {
        this.stopCooldown();
      }
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownTimer !== null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }
}
