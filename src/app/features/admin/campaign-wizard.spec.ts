import { CampaignPlatform } from '../../core/models/campaign';
import { platformLabel } from '../../core/util/campaign-format';
import { PLATFORM_CHOICES } from './campaign-wizard';

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
