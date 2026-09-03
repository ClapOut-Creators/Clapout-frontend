import {
  isPlatformPostUrl,
  platformFromUrl,
  platformHostHint,
  platformMismatchMessage,
  postUrlLabel,
  submissionsOpen,
} from './platform-url';

describe('isPlatformPostUrl', () => {
  it('accepts the platform host and any subdomain of it', () => {
    expect(isPlatformPostUrl('tiktok', 'https://www.tiktok.com/@ama/video/7411')).toBe(true);
    expect(isPlatformPostUrl('tiktok', 'https://vm.tiktok.com/ZM123/')).toBe(true);
    expect(isPlatformPostUrl('tiktok', 'https://tiktok.com/@ama/video/7411')).toBe(true);
  });

  it('accepts every host the contract lists for a platform', () => {
    expect(isPlatformPostUrl('youtube', 'https://youtu.be/AbCdEfG')).toBe(true);
    expect(isPlatformPostUrl('youtube', 'https://m.youtube.com/shorts/AbCdEfG')).toBe(true);
    expect(isPlatformPostUrl('facebook', 'https://fb.watch/xyz/')).toBe(true);
    expect(isPlatformPostUrl('x', 'https://twitter.com/ama/status/1')).toBe(true);
    expect(isPlatformPostUrl('x', 'https://x.com/ama/status/1')).toBe(true);
  });

  it('rejects a link on a different platform', () => {
    expect(isPlatformPostUrl('tiktok', 'https://www.instagram.com/reel/AbC/')).toBe(false);
    expect(isPlatformPostUrl('instagram', 'https://youtu.be/AbCdEfG')).toBe(false);
  });

  it('does not match a host that merely ends with the platform name', () => {
    expect(isPlatformPostUrl('tiktok', 'https://nottiktok.com/@ama/video/1')).toBe(false);
    expect(isPlatformPostUrl('tiktok', 'https://tiktok.com.evil.example/@ama')).toBe(false);
  });

  it('rejects anything that is not an http(s) URL', () => {
    expect(isPlatformPostUrl('tiktok', 'tiktok.com/@ama')).toBe(false);
    expect(isPlatformPostUrl('tiktok', 'javascript:alert(1)')).toBe(false);
  });

  it('stays quiet while the field is empty, so `required` owns that message', () => {
    expect(isPlatformPostUrl('tiktok', '')).toBe(true);
    expect(isPlatformPostUrl('tiktok', '   ')).toBe(true);
  });
});

describe('platformMismatchMessage', () => {
  it('names the platform the clipper registered with', () => {
    expect(platformMismatchMessage('tiktok')).toContain('TikTok link');
    expect(platformMismatchMessage('youtube')).toContain('posted on YouTube');
  });
});

describe('platformHostHint', () => {
  it('lists one host plainly and several with "or"', () => {
    expect(platformHostHint('tiktok')).toBe('tiktok.com');
    expect(platformHostHint('youtube')).toBe('youtube.com or youtu.be');
  });
});

describe('postUrlLabel', () => {
  it('drops the protocol, a leading www. and a trailing slash', () => {
    expect(postUrlLabel('https://www.tiktok.com/@ama/')).toBe('tiktok.com/@ama');
  });

  it('elides the middle of a long link but keeps both ends', () => {
    const label = postUrlLabel('https://www.tiktok.com/@amaclips/video/7411223344556677889', 30);

    expect(label.length).toBe(30);
    expect(label.startsWith('tiktok.com/@am')).toBe(true);
    expect(label.endsWith('77889')).toBe(true);
    expect(label).toContain('…');
  });

  it('returns nothing for a missing link', () => {
    expect(postUrlLabel(null)).toBe('');
    expect(postUrlLabel(undefined)).toBe('');
  });
});

describe('submissionsOpen', () => {
  it('is only true for an ACTIVE campaign', () => {
    expect(submissionsOpen('ACTIVE')).toBe(true);
    expect(submissionsOpen('UPCOMING')).toBe(false);
    expect(submissionsOpen('CLOSED')).toBe(false);
    expect(submissionsOpen('DRAFT')).toBe(false);
    expect(submissionsOpen(undefined)).toBe(false);
  });
});

/**
 * Drives the brand glyph the overlays draw inside a link field. It runs while
 * the clipper is still typing, so half-written text has to come back as "no
 * platform yet" rather than as an exception.
 */
describe('platformFromUrl', () => {
  it('names the platform a profile or post link is on', () => {
    expect(platformFromUrl('https://www.tiktok.com/@ama')).toBe('tiktok');
    expect(platformFromUrl('https://instagram.com/tekmecreatives/')).toBe('instagram');
    expect(platformFromUrl('https://www.youtube.com/@ama')).toBe('youtube');
    expect(platformFromUrl('https://youtu.be/AbCdEfG')).toBe('youtube');
    expect(platformFromUrl('https://web.facebook.com/ama')).toBe('facebook');
    expect(platformFromUrl('https://fb.watch/xyz/')).toBe('facebook');
    expect(platformFromUrl('https://x.com/ama')).toBe('x');
    expect(platformFromUrl('https://twitter.com/ama')).toBe('x');
  });

  it('matches subdomains but not lookalike hosts', () => {
    expect(platformFromUrl('https://vm.tiktok.com/ZM123/')).toBe('tiktok');
    expect(platformFromUrl('https://nottiktok.com/@ama')).toBe(null);
    expect(platformFromUrl('https://tiktok.com.evil.example/@ama')).toBe(null);
  });

  it('has no platform for anything else, half-typed or empty', () => {
    expect(platformFromUrl('https://linktr.ee/ama')).toBe(null);
    expect(platformFromUrl('https://')).toBe(null);
    expect(platformFromUrl('tiktok.com/@ama')).toBe(null);
    expect(platformFromUrl('javascript:alert(1)')).toBe(null);
    expect(platformFromUrl('')).toBe(null);
    expect(platformFromUrl(null)).toBe(null);
    expect(platformFromUrl(undefined)).toBe(null);
  });
});
