import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { Me } from '../../core/models/user';
import { CreatorPageHeader, Crumb, DASHBOARD_CRUMB } from './creator-page-header';

const creator: Me = {
  id: 'creator-1',
  email: 'cara@clapout.test',
  fullName: 'Cara Creator',
  role: 'CREATOR',
  phone: null,
  whatsapp: null,
  socials: [],
  payout: null,
  communityJoinedAt: '2026-08-02T00:00:00.000Z',
  emailVerifiedAt: '2026-08-01T00:00:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z',
};

function authDouble(user: Me | null) {
  const currentUser = signal<Me | null>(user);
  return {
    user: currentUser.asReadonly(),
    isSignedIn: computed(() => currentUser() !== null),
    isAdmin: computed(() => currentUser()?.role === 'ADMIN'),
  };
}

describe('CreatorPageHeader', () => {
  async function render(crumbs: Crumb[], user: Me | null = creator) {
    await TestBed.configureTestingModule({
      imports: [CreatorPageHeader],
      providers: [provideRouter([]), { provide: AuthService, useValue: authDouble(user) }],
    }).compileComponents();

    const fixture = TestBed.createComponent(CreatorPageHeader);
    fixture.componentRef.setInput('crumbs', crumbs);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('mutes every crumb but the last, which is the current page', async () => {
    const element = await render(['Dashboard', 'E-wale clipping']);

    const crumbs = Array.from(element.querySelectorAll('[aria-current], .truncate')).filter(
      (node) => node.textContent?.trim() === 'Dashboard' || node.textContent?.trim().length,
    );
    const dashboard = crumbs.find((node) => node.textContent?.trim() === 'Dashboard');
    const current = element.querySelector('[aria-current="page"]');

    expect(dashboard?.className).toContain('text-[#A8A8A8]');
    expect(current?.textContent?.trim()).toBe('E-wale clipping');
  });

  it('links every crumb before the last, and the home glyph, back up the trail', async () => {
    const element = await render([
      DASHBOARD_CRUMB,
      { label: 'Campaigns', path: '/campaigns' },
      'E-wale',
    ]);

    const links = Array.from(element.querySelectorAll('a')).map((a) => [
      a.textContent?.trim() || a.getAttribute('aria-label'),
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Dashboard', '/creator/dashboard'],
      ['Dashboard', '/creator/dashboard'],
      ['Campaigns', '/campaigns'],
    ]);
    expect(element.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('E-wale');
  });

  it('shows the signed-in name and their seeded avatar', async () => {
    const element = await render(['Dashboard']);

    expect(element.textContent).toContain('Cara Creator');
    expect(element.querySelector('app-clipper-avatar img')?.getAttribute('src')).toContain(
      'seed=creator-1',
    );
  });

  it('falls back to the email local part when the profile has no name', async () => {
    const element = await render(['Dashboard'], { ...creator, fullName: '' });

    expect(element.textContent).toContain('cara');
    expect(element.querySelector('app-clipper-avatar img')).toBeTruthy();
  });

  it('stays renderable with no session at all', async () => {
    const element = await render(['Dashboard'], null);

    expect(element.textContent).toContain('Your account');
  });
});
