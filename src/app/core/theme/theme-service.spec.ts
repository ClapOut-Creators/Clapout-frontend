import { cookieDomainAttribute, readThemeCookie, resolveTheme } from './theme-service';

describe('theme carried over from clapoutcreators.com', () => {
  it('reads the shared cookie out of a cookie string', () => {
    expect(readThemeCookie('clapout-theme=dark')).toBe('dark');
    expect(readThemeCookie('a=1; clapout-theme=light; b=2')).toBe('light');
    expect(readThemeCookie('other-theme=dark')).toBeNull();
    expect(readThemeCookie('clapout-theme=purple')).toBeNull();
    expect(readThemeCookie('')).toBeNull();
  });

  it('prefers the cookie, then local storage, then the OS setting', () => {
    expect(resolveTheme('dark', 'light', false)).toBe('dark');
    expect(resolveTheme(null, 'dark', false)).toBe('dark');
    expect(resolveTheme(null, null, true)).toBe('dark');
    expect(resolveTheme(null, 'nonsense', false)).toBe('light');
  });

  it('scopes the cookie to the whole clapoutcreators.com domain in production only', () => {
    expect(cookieDomainAttribute('app.clapoutcreators.com')).toBe('; domain=.clapoutcreators.com');
    expect(cookieDomainAttribute('clapoutcreators.com')).toBe('; domain=.clapoutcreators.com');
    expect(cookieDomainAttribute('localhost')).toBe('');
    expect(cookieDomainAttribute('clapout-frontend.vercel.app')).toBe('');
  });
});
