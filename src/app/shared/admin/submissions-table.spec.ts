import { ApiError } from '../../core/api/api-error';
import { previewPayout, reviewErrorMessage } from './submissions-table';

describe('previewPayout', () => {
  it('pays verifiedViews / 1000 x cpm', () => {
    expect(previewPayout(12_000, 20)).toBe(240);
    expect(previewPayout(500, 20)).toBe(10);
  });

  it('rounds to two decimals, as the backend freezes it', () => {
    expect(previewPayout(1234, 1.5)).toBe(1.85);
    expect(previewPayout(1, 20)).toBe(0.02);
  });

  it('has no preview without a view count or a campaign CPM', () => {
    expect(previewPayout(null, 20)).toBeNull();
    expect(previewPayout(12_000, null)).toBeNull();
    expect(previewPayout(null, null)).toBeNull();
  });

  it('is zero for zero verified views rather than null', () => {
    expect(previewPayout(0, 20)).toBe(0);
  });
});

describe('reviewErrorMessage', () => {
  it('points at the missing campaign rate', () => {
    expect(reviewErrorMessage(new ApiError(422, 'CAMPAIGN_CPM_MISSING', 'No cpm'))).toContain(
      'Add a rate to the campaign first',
    );
  });

  it('explains that paying needs an approval first', () => {
    expect(reviewErrorMessage(new ApiError(422, 'NOT_APPROVED', 'Nope'))).toBe(
      'Approve the clip before marking it paid.',
    );
  });

  it('tells the admin to refresh a row that has gone', () => {
    expect(reviewErrorMessage(new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Gone'))).toContain(
      'Refresh the table',
    );
  });

  it('passes any other server message through', () => {
    expect(reviewErrorMessage(new ApiError(500, 'INTERNAL', 'Something went wrong.'))).toBe(
      'Something went wrong.',
    );
  });

  it('degrades to a retry hint when the failure is not an ApiError', () => {
    expect(reviewErrorMessage(new Error('boom'))).toBe(
      'We could not update this submission. Please try again.',
    );
  });
});
