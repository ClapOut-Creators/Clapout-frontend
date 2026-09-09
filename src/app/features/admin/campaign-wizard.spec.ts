import { CampaignPlatform } from '../../core/models/campaign';
import { platformLabel } from '../../core/util/campaign-format';
import {
  campaignScheduleFromParts,
  utcOffsetSuffix,
  campaignScheduleIsOrdered,
  PLATFORM_CHOICES,
  timeFromDate,
} from './campaign-wizard';

/**
 * The "Campaign Platforms" step is a fixed list of rows, in the order the design
 * sets (172:3073). An admin can only tick what this list offers, so a platform
 * missing from it is a platform no campaign can ever run on.
 */
describe('PLATFORM_CHOICES', () => {
  it('offers every platform, in the order the design sets', () => {
    expect(PLATFORM_CHOICES.map((choice) => choice.value)).toEqual([
      'tiktok',
      'instagram',
      'facebook',
      'youtube',
      'x',
      'snapchat',
      'whatsapp',
    ] satisfies CampaignPlatform[]);
  });

  it('labels the two newest rows the way the rest of the app names them', () => {
    const byValue = new Map(PLATFORM_CHOICES.map((choice) => [choice.value, choice]));

    expect(byValue.get('snapchat')?.label).toBe(platformLabel('snapchat'));
    expect(byValue.get('whatsapp')?.label).toBe(platformLabel('whatsapp'));
    // 'YouTube Reel' names the format, not the platform, so it is free to differ.
    expect(byValue.get('youtube')?.label).toBe('YouTube Reel');
  });

  it('gives every tile a background and a mark colour', () => {
    for (const choice of PLATFORM_CHOICES) {
      expect(choice.tileClass).toMatch(/^bg-\[/);
      expect(choice.tileClass).toMatch(/\btext-(white|\[#[0-9A-Fa-f]{6}\])$/);
    }
  });
});

describe('campaign schedule helpers', () => {
  it('composes local dates and times into campaign ISO datetimes', () => {
    const schedule = campaignScheduleFromParts(
      [new Date(2026, 8, 3), new Date(2026, 8, 4)],
      new Date(2026, 0, 1, 23, 0),
      new Date(2026, 0, 1, 1, 30),
    );

    expect(schedule).toEqual({
      startDate: `2026-09-03T23:00:00${utcOffsetSuffix(new Date(2026, 8, 3, 23, 0))}`,
      endDate: `2026-09-04T01:30:00${utcOffsetSuffix(new Date(2026, 8, 4, 1, 30))}`,
    });
  });

  it('stamps the zone offset so the schedule is one instant everywhere', () => {
    expect(utcOffsetSuffix(new Date(2026, 8, 3, 23, 0))).toMatch(/^[+-]\d{2}:\d{2}$/);
    const startDate = campaignScheduleFromParts(
      [new Date(2026, 8, 3), null],
      new Date(2026, 0, 1, 23, 0),
      null,
    ).startDate;
    // Round-tripping through Date must land on the same wall-clock minute.
    expect(new Date(startDate!).getTime()).toBe(new Date(2026, 8, 3, 23, 0).getTime());
  });

  it('requires both dates and both times before producing a complete schedule', () => {
    expect(
      campaignScheduleFromParts(
        [new Date(2026, 8, 3), new Date(2026, 8, 4)],
        null,
        new Date(2026, 0, 1, 1, 30),
      ),
    ).toEqual({
      startDate: null,
      endDate: expect.stringMatching(/^2026-09-04T01:30:00[+-]\d{2}:\d{2}$/),
    });

    expect(
      campaignScheduleFromParts(
        [new Date(2026, 8, 3), null],
        new Date(2026, 0, 1, 23, 0),
        new Date(2026, 0, 1, 1, 30),
      ),
    ).toEqual({
      startDate: expect.stringMatching(/^2026-09-03T23:00:00[+-]\d{2}:\d{2}$/),
      endDate: null,
    });
  });

  it('rejects an end datetime that is before or equal to the start datetime', () => {
    expect(
      campaignScheduleIsOrdered({
        startDate: '2026-09-03T23:00:00',
        endDate: '2026-09-03T22:59:00',
      }),
    ).toBe(false);
    expect(
      campaignScheduleIsOrdered({
        startDate: '2026-09-03T23:00:00',
        endDate: '2026-09-03T23:00:00',
      }),
    ).toBe(false);
    expect(
      campaignScheduleIsOrdered({
        startDate: '2026-09-03T23:00:00',
        endDate: '2026-09-04T00:00:00',
      }),
    ).toBe(true);
  });

  it('extracts editable time values from existing campaign datetimes', () => {
    const time = timeFromDate(new Date('2026-09-03T23:15:00'));

    expect(time.getHours()).toBe(23);
    expect(time.getMinutes()).toBe(15);
    expect(time.getSeconds()).toBe(0);
  });
});
