import { ApiError, NETWORK_ERROR } from '../../core/api/api-error';
import { brandInviteEmailError } from './brand-invite-dialog';

function apiError(status: number, code: string, message = 'Server said so.'): ApiError {
  return new ApiError(status, code, message);
}

/**
 * The one line the admin reads when a send is refused. It has to name
 * something they can act on, and for the provider's own refusals that means
 * repeating the provider verbatim rather than flattening every failure into
 * "try again".
 */
describe('brandInviteEmailError', () => {
  it('sends the admin to the address field when the invite carries none', () => {
    expect(brandInviteEmailError(apiError(422, 'INVITE_EMAIL_MISSING'))).toContain(
      'type one above',
    );
  });

  it('passes Resend’s own reason through for EMAIL_FAILED', () => {
    expect(
      brandInviteEmailError(apiError(502, 'EMAIL_FAILED', 'The domain is not verified.')),
    ).toBe('The domain is not verified.');
  });

  it('explains that a dead invite cannot be emailed', () => {
    expect(brandInviteEmailError(apiError(409, 'INVITE_NOT_PENDING'))).toContain('no longer live');
  });

  it('asks for a refresh when the invite has gone', () => {
    expect(brandInviteEmailError(apiError(404, 'INVITE_NOT_FOUND'))).toContain('Refresh the list');
  });

  it('shows what the API objected to on VALIDATION', () => {
    expect(brandInviteEmailError(apiError(422, 'VALIDATION', 'to must be an email'))).toBe(
      'to must be an email',
    );
  });

  it('falls back to the example address when VALIDATION says nothing useful', () => {
    expect(brandInviteEmailError(apiError(422, 'VALIDATION', ''))).toContain('name@brand.com');
  });

  it('keeps the network message, which already explains itself', () => {
    expect(
      brandInviteEmailError(new ApiError(0, NETWORK_ERROR, 'We could not reach the ClapOut API.')),
    ).toBe('We could not reach the ClapOut API.');
  });

  it('has copy for something that never reached the API at all', () => {
    expect(brandInviteEmailError(new TypeError('boom'))).toContain('could not send this email');
  });
});
