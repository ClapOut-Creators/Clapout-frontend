import { Injectable, signal } from '@angular/core';

export const TOKEN_STORAGE_KEY = 'clapout.token';

/**
 * Owns the persisted bearer token.
 *
 * Deliberately dependency-free: the HTTP interceptor reads the token from here
 * instead of from `AuthService`, which would create a cyclic dependency the
 * moment `AuthService` issues its own rehydration request.
 *
 * "Remember me" picks the backing store: localStorage survives the browser
 * closing, sessionStorage ends with the tab session.
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly state = signal<string | null>(readStoredToken());

  readonly token = this.state.asReadonly();

  set(token: string, remember = true): void {
    this.state.set(token);
    try {
      const target = remember ? localStorage : sessionStorage;
      const other = remember ? sessionStorage : localStorage;
      target.setItem(TOKEN_STORAGE_KEY, token);
      other.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Private mode / storage disabled: keep the in-memory session only.
    }
  }

  clear(): void {
    this.state.set(null);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
  }
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}
