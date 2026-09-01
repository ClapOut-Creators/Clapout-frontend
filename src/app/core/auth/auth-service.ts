import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { APP_ENVIRONMENT } from '../config/app-environment';
import { AuthSession, Me, SignInPayload, SignUpPayload } from '../models/user';
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
