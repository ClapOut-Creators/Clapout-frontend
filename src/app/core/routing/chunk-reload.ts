import { NavigationError } from '@angular/router';

/**
 * Recovery for stale lazy-route bundles.
 *
 * Every feature area is lazy-loaded, so a tab that was opened before a deploy
 * (or before a dev-server rebuild) still holds an index that names chunk files
 * which no longer exist. The next navigation into an area not yet visited then
 * fails to import its chunk, the router rejects the navigation, and the page
 * that started it shows an error that has nothing to do with what the user
 * did — most visibly the sign-in form saying it "could not sign you in" after
 * a 200 from the API. A full reload fetches the current index, which is the
 * workaround users discover by hand; this does it for them, once.
 */

const RELOAD_FLAG_KEY = 'clapout.bundle-reload';

/** Shown by the auth forms when the session is fine but the next page is not. */
export const NEXT_PAGE_FAILED_MESSAGE =
  'You are signed in, but the next page did not load. Refresh the page to continue.';

/** True for the errors browsers raise when a lazy chunk cannot be fetched. */
export function isChunkLoadError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : '';
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
    text,
  );
}

/**
 * Hard-load `url` to pick up a fresh bundle, at most once per tab session for
 * that URL — a chunk that is genuinely broken must surface as an error, not a
 * reload loop. Returns true when the reload was started.
 */
export function reloadForFreshBundle(
  url: string,
  assign: (href: string) => void = (href) => location.assign(href),
): boolean {
  let target: string;
  try {
    const parsed = new URL(url, location.origin);
    // Only ever reload within the app: a returnUrl of "//evil.example" must not
    // turn this recovery into an off-site redirect.
    if (parsed.origin !== location.origin) {
      return false;
    }
    target = parsed.href;
  } catch {
    return false;
  }
  try {
    if (sessionStorage.getItem(RELOAD_FLAG_KEY) === target) {
      return false;
    }
    sessionStorage.setItem(RELOAD_FLAG_KEY, target);
  } catch {
    // Storage unavailable: still worth one attempt; a loop is impossible to
    // detect without it, so bail rather than risk one.
    return false;
  }
  assign(target);
  return true;
}

/** Router hook: a navigation that died on a missing chunk reloads instead. */
export function reloadOnChunkLoadError(error: NavigationError): void {
  if (isChunkLoadError(error.error)) {
    reloadForFreshBundle(error.url);
  }
}
