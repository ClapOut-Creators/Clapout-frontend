import { BrandInviteStatus } from '../models/brand-invite';
import { brandInviteStatusLabel, brandInviteStatusTone } from './campaign-format';

/**
 * The label/tone pairs the whole app renders status chips from. Covers the
 * brand-invite family; the older campaign / registration / submission helpers
 * predate this file and are exercised through their pages.
 */
describe('brandInviteStatusLabel', () => {
  it('gives every status sentence-case copy', () => {
    expect(brandInviteStatusLabel('PENDING')).toBe('Pending');
    expect(brandInviteStatusLabel('COMPLETED')).toBe('Completed');
    expect(brandInviteStatusLabel('REVOKED')).toBe('Revoked');
    expect(brandInviteStatusLabel('EXPIRED')).toBe('Expired');
  });

  it('echoes a status the contract has not taught it yet', () => {
    expect(brandInviteStatusLabel('SOMETHING_NEW' as BrandInviteStatus)).toBe('SOMETHING_NEW');
  });
});

describe('brandInviteStatusTone', () => {
  it('separates a live link, a finished one and the two dead ones', () => {
    expect(brandInviteStatusTone('PENDING')).toBe('info');
    expect(brandInviteStatusTone('COMPLETED')).toBe('success');
    expect(brandInviteStatusTone('REVOKED')).toBe('danger');
    expect(brandInviteStatusTone('EXPIRED')).toBe('secondary');
  });

  it('falls back to neutral for an unknown status', () => {
    expect(brandInviteStatusTone('SOMETHING_NEW' as BrandInviteStatus)).toBe('secondary');
  });
});
