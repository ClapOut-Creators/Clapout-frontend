import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/**
 * Shared with clapoutcreators.com. Cookies are the one store both sites can
 * read: localStorage is per origin, and `app.` is a different origin from
 * the apex. Set on `.clapoutcreators.com` it is visible to both.
 */
export const THEME_COOKIE = 'clapout-theme';
/** The landing site's own localStorage key, kept for a same-origin fallback. */
export const THEME_STORAGE_KEY = 'theme';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The `clapout-theme` value from a document.cookie string, or null. */
export function readThemeCookie(cookie: string): Theme | null {
  const match = cookie.match(/(?:^|;\s*)clapout-theme=(dark|light)(?:;|$)/);
  return match ? (match[1] as Theme) : null;
}

/**
 * Cookie first (it is what the other site most recently wrote), then this
 * origin's own storage, then the OS preference — the same order the landing
 * site resolves in, so a visitor sees one theme across both.
 */
export function resolveTheme(
  cookie: Theme | null,
  stored: string | null,
  prefersDark: boolean,
): Theme {
  if (cookie) {
    return cookie;
  }
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return prefersDark ? 'dark' : 'light';
}

/** `; domain=.clapoutcreators.com` in production; nothing on localhost, where the host is shared anyway. */
export function cookieDomainAttribute(hostname: string): string {
  return hostname === 'clapoutcreators.com' || hostname.endsWith('.clapoutcreators.com')
    ? '; domain=.clapoutcreators.com'
    : '';
}

/**
 * Light/dark for the signed-out public pages, carried over from the landing
 * site and back. The class itself (`co-dark` on `<html>`) is applied by the
 * app shell, which only does so while the public chrome is showing — the
 * signed-in studio has no dark theme.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly current = signal<Theme>(this.initial());

  readonly theme = this.current.asReadonly();

  isDark(): boolean {
    return this.current() === 'dark';
  }

  toggle(): void {
    this.set(this.current() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.current.set(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode: the cookie still carries it */
    }
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax${cookieDomainAttribute(location.hostname)}`;
  }

  private initial(): Theme {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const prefersDark =
      typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    return resolveTheme(readThemeCookie(document.cookie), stored, prefersDark);
  }
}
