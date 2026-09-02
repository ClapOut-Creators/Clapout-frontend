import { ApiError } from '../../core/api/api-error';
import { submissionErrorMessage, toIsoDate } from './submit-clip';

function apiError(code: string, message = 'Server said so.'): ApiError {
  return new ApiError(422, code, message);
}

describe('submissionErrorMessage', () => {
  it('explains a registration that has not been accepted', () => {
    expect(submissionErrorMessage(apiError('REGISTRATION_NOT_ACCEPTED'), 'tiktok')).toContain(
      'has not been accepted yet',
    );
  });

  it('explains a campaign that is no longer taking clips', () => {
    expect(submissionErrorMessage(apiError('SUBMISSIONS_CLOSED'), 'tiktok')).toContain(
      'no longer running',
    );
  });

  it('names the registered platform on a host mismatch', () => {
    expect(submissionErrorMessage(apiError('POST_URL_PLATFORM_MISMATCH'), 'youtube')).toContain(
      'YouTube',
    );
  });

  it('falls back to generic wording when the platform is unknown', () => {
    expect(submissionErrorMessage(apiError('POST_URL_PLATFORM_MISMATCH'), null)).toBe(
      'That link is not on the platform you registered with.',
    );
  });

  it('uses the agreed copy for a duplicate clip', () => {
    expect(submissionErrorMessage(apiError('DUPLICATE_SUBMISSION'), 'tiktok')).toBe(
      'This clip has already been submitted.',
    );
  });

  it('shows the server message for a validation failure', () => {
    expect(
      submissionErrorMessage(apiError('VALIDATION', 'screenshotUrl is too large.'), 'tiktok'),
    ).toBe('screenshotUrl is too large.');
  });

  it('shows the server message for an unmapped code', () => {
    expect(submissionErrorMessage(apiError('TEAPOT', 'Nope.'), 'tiktok')).toBe('Nope.');
  });

  it('degrades to a retry hint when the failure is not an ApiError', () => {
    expect(submissionErrorMessage(new Error('boom'), 'tiktok')).toBe(
      'We could not submit your clip. Please try again.',
    );
  });
});

describe('toIsoDate', () => {
  it('formats the local calendar date, not the UTC one', () => {
    // 23:30 local on 1 September is still 1 September, even where that is
    // already the 2nd in UTC.
    expect(toIsoDate(new Date(2026, 8, 1, 23, 30))).toBe('2026-09-01');
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
