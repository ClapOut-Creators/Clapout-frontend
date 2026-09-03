import {
  isPlatformPostUrl,
  platformFromUrl,
  platformHostHint,
  platformMismatchMessage,
  platformPostPlaceholder,
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

  it('holds Snapchat to snapchat.com and its subdomains', () => {
    expect(isPlatformPostUrl('snapchat', 'https://www.snapchat.com/spotlight/AbCdEfG')).toBe(true);
    expect(isPlatformPostUrl('snapchat', 'https://snapchat.com/t/AbCdEfG')).toBe(true);
    expect(isPlatformPostUrl('snapchat', 'https://notsnapchat.com/spotlight/AbC')).toBe(false);
    expect(isPlatformPostUrl('snapchat', 'https://www.tiktok.com/@ama/video/7411')).toBe(false);
  });

  it('accepts any link for WhatsApp, whose stories have no public host', () => {
    expect(isPlatformPostUrl('whatsapp', 'https://drive.google.com/file/d/AbC/view')).toBe(true);
    expect(isPlatformPostUrl('whatsapp', 'https://www.tiktok.com/@ama/video/7411')).toBe(true);
    expect(isPlatformPostUrl('whatsapp', 'https://wa.me/233202457890')).toBe(true);
  });
});

describe('platformMismatchMessage', () => {
  it('names the platform the clipper registered with', () => {
    expect(platformMismatchMessage('tiktok')).toContain('TikTok link');
    expect(platformMismatchMessage('youtube')).toContain('posted on YouTube');
    expect(platformMismatchMessage('snapchat')).toContain('Snapchat link');
  });

  it('never accuses a WhatsApp clipper, since no link can mismatch', () => {
    expect(platformMismatchMessage('whatsapp')).not.toContain('doesn’t look like');
    expect(platformMismatchMessage('whatsapp')).toBe(platformHostHint('whatsapp'));
  });
});

describe('platformHostHint', () => {
  it('lists one host plainly and several with "or"', () => {
    expect(platformHostHint('tiktok')).toBe('tiktok.com');
    expect(platformHostHint('youtube')).toBe('youtube.com or youtu.be');
    expect(platformHostHint('snapchat')).toBe('snapchat.com');
  });

  it('tells a WhatsApp clipper what to paste instead of a host', () => {
    expect(platformHostHint('whatsapp')).toBe(
      'WhatsApp stories have no public link — paste a link to the story video ' +
        '(a Drive link is fine) and add the screenshot.',
    );
  });
});

describe('platformPostPlaceholder', () => {
  it('shows a real example link for every platform', () => {
    expect(platformPostPlaceholder('snapchat')).toBe(
      'https://www.snapchat.com/spotlight/AbCdEfGhIjK',
    );
    // WhatsApp has no post URL of its own, so the example is where the file lives.
    expect(platformPostPlaceholder('whatsapp')).toContain('drive.google.com');
    expect(platformPostPlaceholder('x')).toContain('x.com');
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
    expect(platformFromUrl('https://www.snapchat.com/add/ama')).toBe('snapchat');
    expect(platformFromUrl('https://wa.me/233202457890')).toBe('whatsapp');
  });

  it('never claims WhatsApp for a link that merely has no home', () => {
    expect(platformFromUrl('https://drive.google.com/file/d/AbC/view')).toBe(null);
    expect(platformFromUrl('https://example.test/story.mp4')).toBe(null);
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
