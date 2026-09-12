import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { APP_ENVIRONMENT } from '../config/app-environment';
import {
  AuthSession,
  Me,
  ProfilePatch,
  ResendVerificationResponse,
  SignInPayload,
  SignUpPayload,
  VerifyEmailResponse,
} from '../models/user';
import { TokenStore } from './token-store';

/**
 * Signal-based session state for the creator experience.
 *
 * The token lives in {@link TokenStore} (localStorage, key `clapout.token`);
 * the profile is rehydrated once per app start through `GET /me`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStore);
  private readonly baseUrl = inject(APP_ENVIRONMENT).apiBaseUrl;

  private readonly currentUser = signal<Me | null>(null);
  private readonly rehydrating = signal(false);
  private bootstrapTask: Promise<void> | null = null;

  readonly user = this.currentUser.asReadonly();
  /** True while the startup `GET /me` call is in flight. */
  readonly isRehydrating = this.rehydrating.asReadonly();
  readonly hasToken = computed(() => this.tokens.token() !== null);
  readonly isSignedIn = computed(() => this.tokens.token() !== null && this.currentUser() !== null);
  /** Drives the admin guard and the role-aware side nav. */
  readonly isAdmin = computed(() => this.isSignedIn() && this.currentUser()?.role === 'ADMIN');
  /** The signed-in user has opened the verification link we emailed them. */
  readonly emailVerified = computed(() => !!this.currentUser()?.emailVerifiedAt);
  /**
   * A signed-in creator who has not yet verified their email or confirmed
   * joining the WhatsApp community. Drives the onboarding page after sign-up,
   * the dashboard's onboarding sheet, and `onboardingGuard` on the apply route.
   */
  readonly needsOnboarding = computed(() => {
    const user = this.currentUser();
    return (
      this.isSignedIn() &&
      user?.role === 'CREATOR' &&
      (user.emailVerifiedAt === null || user.communityJoinedAt === null)
    );
  });

  constructor() {
    // A 401 anywhere in the app clears the token (see authInterceptor); drop the
    // cached profile with it so guards and the nav shell stay consistent.
    effect(() => {
      if (this.tokens.token() === null) {
        this.currentUser.set(null);
      }
    });
  }

  /**
   * Rehydrates the session exactly once. Safe to call from an app initializer
   * and from guards; later callers await the same in-flight promise.
   */
  bootstrap(): Promise<void> {
    this.bootstrapTask ??= this.tokens.token() ? this.loadMe() : Promise.resolve();
    return this.bootstrapTask;
  }

  /** Resolves when the session is known (signed in or definitively anonymous). */
  whenSessionReady(): Promise<void> {
    return this.bootstrap();
  }

  async signUp(payload: SignUpPayload): Promise<Me> {
    return this.startSession('sign-up', payload);
  }

  async signIn(payload: SignInPayload, remember = true): Promise<Me> {
    return this.startSession('sign-in', payload, remember);
  }

  signOut(): void {
    this.tokens.clear();
    this.currentUser.set(null);
    this.bootstrapTask = Promise.resolve();
  }

  /**
   * `PATCH /me` — partial profile update. The session copy of `user` is
   * replaced with what the API echoed back, so every `computed` reading it
   * (the dashboard checklist, `needsOnboarding`) updates without a reload.
   */
  async updateProfile(patch: ProfilePatch): Promise<Me> {
    try {
      const response = await firstValueFrom(
        this.http.patch<{ user: Me }>(`${this.baseUrl}/me`, patch),
      );
      this.currentUser.set(response.user);
      return response.user;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * Re-reads `GET /me` and replaces the session copy. Used while a creator
   * waits on the "verify your email" step, so a link opened in another tab
   * is noticed without a reload. Resolves null when nobody is signed in.
   */
  async refreshProfile(): Promise<Me | null> {
    if (!this.tokens.token()) {
      return null;
    }
    try {
      const response = await firstValueFrom(this.http.get<{ user: Me }>(`${this.baseUrl}/me`));
      this.currentUser.set(response.user);
      return response.user;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /auth/verify-email` — redeems the token from the emailed link.
   * Unauthenticated: the token alone identifies the account. Throws
   * `ApiError` `INVALID_VERIFICATION_TOKEN` (400) for an unknown, used or
   * expired link. When the verified account is the one signed in here, the
   * session copy is updated so `needsOnboarding` and the checklist move on.
   */
  async verifyEmail(token: string): Promise<Me> {
    try {
      const response = await firstValueFrom(
        this.http.post<VerifyEmailResponse>(`${this.baseUrl}/auth/verify-email`, { token }),
      );
      if (this.currentUser()?.id === response.user.id) {
        this.currentUser.set(response.user);
      }
      return response.user;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /auth/resend-verification` — emails a fresh link to the signed-in
   * creator's own address. Throws `ApiError` `VERIFICATION_COOLDOWN` (429)
   * when the previous one went out less than a minute ago.
   */
  async resendVerification(): Promise<ResendVerificationResponse> {
    try {
      return await firstValueFrom(
        this.http.post<ResendVerificationResponse>(`${this.baseUrl}/auth/resend-verification`, {}),
      );
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /auth/forgot-password` — always resolves with 200 when the email is
   * well formed (the API never reveals whether an account exists); a malformed
   * address throws `ApiError` 422. Unauthenticated: no token is issued or read,
   * and an existing session is left untouched.
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<{ ok: true }>(`${this.baseUrl}/auth/forgot-password`, { email }),
      );
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /auth/reset-password` — throws `ApiError` with code
   * `INVALID_RESET_TOKEN` (400) when the link is unknown, expired or already
   * used, or 422 when the password is too short. Unauthenticated, and it does
   * not sign the user in: the caller routes them to sign-in afterwards.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<{ ok: true }>(`${this.baseUrl}/auth/reset-password`, { token, password }),
      );
    } catch (error) {
      throw toApiError(error);
    }
  }

  private async startSession(
    endpoint: 'sign-in' | 'sign-up',
    payload: SignInPayload | SignUpPayload,
    remember = true,
  ): Promise<Me> {
    try {
      const session = await firstValueFrom(
        this.http.post<AuthSession>(`${this.baseUrl}/auth/${endpoint}`, payload),
      );
      this.tokens.set(session.token, remember);
      this.currentUser.set(session.user);
      this.bootstrapTask = Promise.resolve();
      return session.user;
    } catch (error) {
      throw toApiError(error);
    }
  }

  private async loadMe(): Promise<void> {
    this.rehydrating.set(true);
    try {
      const response = await firstValueFrom(this.http.get<{ user: Me }>(`${this.baseUrl}/me`));
      this.currentUser.set(response.user);
    } catch {
      // 401 already cleared the token in the interceptor; any other failure
      // leaves the visitor anonymous until they retry a guarded route.
      this.currentUser.set(null);
    } finally {
      this.rehydrating.set(false);
    }
  }
}
