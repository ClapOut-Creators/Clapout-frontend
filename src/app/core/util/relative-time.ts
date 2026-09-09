/**
 * '3d ago' — how long ago a timestamp was, in the coarsest unit that still
 * reads honestly. Anything under a day degrades to hours and then minutes so a
 * board that moved five minutes ago does not report '0d ago'.
 *
 * Shared by the admin submissions table ("Views checked · 3d ago") and the
 * campaign leaderboard ("Updated 3h ago"). Both hide the whole label when there
 * is nothing to report, so a missing or unparsable value answers `null` rather
 * than a placeholder.
 */
export function shortElapsed(
  iso: string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!iso) {
    return null;
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return null;
  }
  const minutes = Math.floor(Math.max(0, now - then) / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}
