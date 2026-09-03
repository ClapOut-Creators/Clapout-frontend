import { ApiError, NETWORK_ERROR } from '../../core/api/api-error';
import { brandInviteCompleteFailure } from './brand-onboarding';

function apiError(status: number, code: string, message = 'Server said so.'): ApiError {
  return new ApiError(status, code, message);
}

describe('brandInviteCompleteFailure', () => {
  it('puts a duplicate brand name back on the details step', () => {
    const failure = brandInviteCompleteFailure(apiError(409, 'BRAND_EXISTS'));
    expect(failure.kind).toBe('name');
    expect(failure.message).toContain('already exists on ClapOut');
  });

  it('treats any 409 as the name clash it can only be', () => {
    expect(brandInviteCompleteFailure(apiError(409, 'SOMETHING_ELSE')).kind).toBe('name');
  });

  it('maps each 410 onto the dead-link state it names', () => {
    expect(brandInviteCompleteFailure(apiError(410, 'INVITE_USED'))).toMatchObject({
      kind: 'closed',
      status: 'COMPLETED',
    });
    expect(brandInviteCompleteFailure(apiError(410, 'INVITE_REVOKED'))).toMatchObject({
      kind: 'closed',
      status: 'REVOKED',
    });
    expect(brandInviteCompleteFailure(apiError(410, 'INVITE_EXPIRED'))).toMatchObject({
      kind: 'closed',
      status: 'EXPIRED',
    });
  });

  it('still shows a dead link for a 410 it cannot name', () => {
    expect(brandInviteCompleteFailure(apiError(410, 'SOMETHING_NEW'))).toMatchObject({
      kind: 'closed',
      status: null,
    });
  });

  it('sends an unknown token to the invalid-link screen', () => {
    expect(brandInviteCompleteFailure(apiError(404, 'INVITE_NOT_FOUND')).kind).toBe('invalid');
  });

  it('asks the visitor to wait after a rate limit', () => {
    const failure = brandInviteCompleteFailure(apiError(429, 'RATE_LIMITED'));
    expect(failure.kind).toBe('banner');
    expect(failure.message).toBe('Too many attempts. Please try again in a few minutes.');
  });

  it('shows what the API objected to on a 422', () => {
    const failure = brandInviteCompleteFailure(apiError(422, 'VALIDATION', 'name is required'));
    expect(failure).toEqual({ kind: 'banner', message: 'name is required' });
  });

  it('falls back to its own wording when a 422 carries no message', () => {
    expect(brandInviteCompleteFailure(apiError(422, 'VALIDATION', '')).message).toContain(
      'not accepted',
    );
  });

  it('keeps the network message, which already tells the visitor what to do', () => {
    const offline = new ApiError(0, NETWORK_ERROR, 'We could not reach the ClapOut API.');
    expect(brandInviteCompleteFailure(offline)).toEqual({
      kind: 'banner',
      message: 'We could not reach the ClapOut API.',
    });
  });

  it('handles something that is not an ApiError at all', () => {
    expect(brandInviteCompleteFailure(new Error('boom'))).toEqual({
      kind: 'banner',
      message: 'We could not save your brand. Please try again.',
    });
  });
});
