import { ApiError } from '../api/api-error';
import { CampaignPlatform } from '../models/campaign';
import { platformMismatchMessage } from './platform-url';

/**
 * Pure helpers shared by every surface that creates a submission.
 *
 * They used to live inside the standalone `SubmitClip` page; that page was
 * replaced by the submit-post overlay (`shared/creator/submit-post-dialog.ts`),
 * so the mapping and the date formatter moved here rather than into a component
 * only one screen can import. Their unit tests moved with them.
 */

/**
 * Turns a failed `POST /submissions` into copy the clipper can act on. Pure, so
 * the mapping is unit-tested without standing up the component.
 */
export function submissionErrorMessage(error: unknown, platform: CampaignPlatform | null): string {
  if (!(error instanceof ApiError)) {
    return 'We could not submit your clip. Please try again.';
  }
  switch (error.code) {
    case 'REGISTRATION_NOT_ACCEPTED':
      return 'Your application for this campaign has not been accepted yet, so clips cannot be submitted.';
    case 'SUBMISSIONS_CLOSED':
      return 'This campaign is no longer running, so it is not accepting clips.';
    case 'POST_URL_PLATFORM_MISMATCH':
      return platform
        ? platformMismatchMessage(platform)
        : 'That link is not on the platform you registered with.';
    case 'DUPLICATE_SUBMISSION':
      return 'This clip has already been submitted.';
    case 'REGISTRATION_NOT_FOUND':
      return 'We could not find your registration for this campaign. Reload the page and try again.';
    case 'VALIDATION':
      return error.message;
    default:
      return error.message;
  }
}

/**
 * True when the failure belongs to the post link itself rather than to the
 * screenshot or the payout details — the submit overlay walks back to step 1
 * for these so the clipper lands on the field they have to change.
 */
export function isPostUrlSubmissionError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === 'POST_URL_PLATFORM_MISMATCH' || error.code === 'DUPLICATE_SUBMISSION')
  );
}

/** Local calendar date as 'YYYY-MM-DD' — `toISOString()` would shift the day. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
