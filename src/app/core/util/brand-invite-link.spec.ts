import {
  brandInviteLink,
  brandInviteMessage,
  BRAND_ONBOARDING_PATH,
  whatsappShareUrl,
} from './brand-invite-link';

describe('brandInviteLink', () => {
  it('hangs the token off the public onboarding path', () => {
    expect(brandInviteLink('abc123', 'https://studio.clapout.test')).toBe(
      `https://studio.clapout.test${BRAND_ONBOARDING_PATH}/abc123`,
    );
  });

  it('does not double the slash when the origin carries a trailing one', () => {
    expect(brandInviteLink('abc123', 'http://localhost:4200/')).toBe(
      'http://localhost:4200/brand/onboard/abc123',
    );
  });

  it('escapes a token so it can never break out of the path', () => {
    expect(brandInviteLink('a/b?c', 'https://x.test')).toBe(
      'https://x.test/brand/onboard/a%2Fb%3Fc',
    );
  });

  it('falls back to the current origin', () => {
    expect(brandInviteLink('tok')).toBe(`${window.location.origin}/brand/onboard/tok`);
  });
});

describe('brandInviteMessage', () => {
  it('names the brand when the admin knew it', () => {
    const message = brandInviteMessage('https://x.test/brand/onboard/tok', 'MTN Ghana');
    expect(message).toContain('set up MTN Ghana');
    expect(message).toContain('https://x.test/brand/onboard/tok');
  });

  it('stays generic without a brand name', () => {
    expect(brandInviteMessage('https://x.test/l', null)).toContain('set up your brand');
    expect(brandInviteMessage('https://x.test/l', '   ')).toContain('set up your brand');
  });
});

describe('whatsappShareUrl', () => {
  it('keeps digits only and encodes the message', () => {
    expect(whatsappShareUrl('+233 20 245 7890', 'hi there')).toBe(
      'https://wa.me/233202457890?text=hi%20there',
    );
  });

  it('encodes a link inside the message', () => {
    expect(whatsappShareUrl('+233202457890', 'open https://x.test/a?b=1')).toBe(
      'https://wa.me/233202457890?text=open%20https%3A%2F%2Fx.test%2Fa%3Fb%3D1',
    );
  });

  it('returns null when there is no number to send to', () => {
    expect(whatsappShareUrl('', 'hi')).toBeNull();
    expect(whatsappShareUrl(null, 'hi')).toBeNull();
    expect(whatsappShareUrl('   ', 'hi')).toBeNull();
    expect(whatsappShareUrl('n/a', 'hi')).toBeNull();
  });
});
