import { BrandInviteStatus } from '../models/brand-invite';
import {
  brandInviteStatusLabel,
  brandInviteStatusTone,
  NOT_ANNOUNCED,
  relativeTime,
} from './campaign-format';

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

/**
 * The age of something that just happened, for lines sitting next to the
 * action that caused them. The cut-offs matter more than the wording: a stale
 * "just now" would tell the admin an email went out when it did not.
 */
describe('relativeTime', () => {
  const now = new Date('2026-09-03T12:00:00.000Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('reads "just now" for anything inside the last minute', () => {
    expect(relativeTime(ago(0), now)).toBe('just now');
    expect(relativeTime(ago(59_000), now)).toBe('just now');
  });

  it('counts whole minutes up to the hour', () => {
    expect(relativeTime(ago(60_000), now)).toBe('1 min ago');
    expect(relativeTime(ago(3 * 60_000), now)).toBe('3 min ago');
    expect(relativeTime(ago(59 * 60_000), now)).toBe('59 min ago');
  });

  it('switches to hours, singular on the first one', () => {
    expect(relativeTime(ago(60 * 60_000), now)).toBe('1 hour ago');
    expect(relativeTime(ago(5 * 60 * 60_000), now)).toBe('5 hours ago');
  });

  it('switches to days, singular on the first one', () => {
    expect(relativeTime(ago(24 * 3_600_000), now)).toBe('1 day ago');
    expect(relativeTime(ago(6 * 24 * 3_600_000), now)).toBe('6 days ago');
  });

  it('gives up counting after a week and shows the date instead', () => {
    expect(relativeTime(ago(7 * 24 * 3_600_000), now)).toBe('27 August 2026');
  });

  it('treats a clock running behind the server as "just now", never negative', () => {
    expect(relativeTime(new Date(now + 30_000).toISOString(), now)).toBe('just now');
  });

  it('has nothing to say about a moment that never happened', () => {
    expect(relativeTime(null, now)).toBe(NOT_ANNOUNCED);
    expect(relativeTime(undefined, now)).toBe(NOT_ANNOUNCED);
  });

  it('echoes a value it cannot parse rather than printing "Invalid Date"', () => {
    expect(relativeTime('whenever', now)).toBe('whenever');
  });
});
