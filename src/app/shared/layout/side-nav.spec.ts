import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { Me } from '../../core/models/user';
import { SideNav } from './side-nav';

@Component({ template: '' })
class EmptyRoute {}

function authDouble(user: Me | null) {
  const currentUser = signal<Me | null>(user);
  return {
    user: currentUser.asReadonly(),
    isSignedIn: computed(() => currentUser() !== null),
    isAdmin: computed(() => currentUser()?.role === 'ADMIN'),
    signOut: vi.fn(() => currentUser.set(null)),
  };
}

const adminUser: Me = {
  id: 'admin-1',
  email: 'admin@clapout.test',
  fullName: 'Ada Admin',
  role: 'ADMIN',
  phone: null,
  whatsapp: null,
  socials: [],
  payout: null,
  communityJoinedAt: '2026-08-02T00:00:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z',
};

const creatorUser: Me = {
  ...adminUser,
  id: 'creator-1',
  email: 'creator@clapout.test',
  fullName: 'Cara Creator',
  role: 'CREATOR',
};

describe('SideNav', () => {
  async function render(user: Me | null = adminUser) {
    const auth = authDouble(user);
    await TestBed.configureTestingModule({
      imports: [SideNav],
      providers: [
        provideRouter([
          { path: 'campaigns', component: EmptyRoute },
          { path: 'auth/sign-in', component: EmptyRoute },
        ]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SideNav);
    fixture.detectChanges();
    await fixture.whenStable();
    return { auth, element: fixture.nativeElement as HTMLElement, fixture };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders the admin icon rail with accessible route names', async () => {
    const { element } = await render(adminUser);

    expect(element.querySelector('.co-shell-rail')).toBeTruthy();
    expect(element.querySelector('a[aria-label="Dashboard"]')).toBeTruthy();
    expect(element.querySelector('a[aria-label="Campaigns"]')).toBeTruthy();
    expect(element.querySelector('a[aria-label="Registrations"]')).toBeTruthy();
    expect(element.querySelector('a[aria-label="Submissions"]')).toBeTruthy();
    expect(element.querySelector('a[aria-label="Inquiries"]')).toBeTruthy();
    expect(element.querySelector('button[aria-label="Settings coming soon"]')).toBeTruthy();
    expect(element.querySelector('button[aria-haspopup="menu"]')).toBeTruthy();
  });

  it('renders creator-specific icon destinations', async () => {
    const { element } = await render(creatorUser);

    const links = Array.from(element.querySelectorAll('.co-shell-rail nav a'));
    expect(links).toHaveLength(3);
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Dashboard',
      'Campaigns',
      'Submissions',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/creator/dashboard',
      '/campaigns',
      '/creator/submissions',
    ]);
  });

  it('gives a clipper a labelled three-tab bar and a name chip with its own account menu', async () => {
    const { auth, element, fixture } = await render(creatorUser);

    const tabs = Array.from(element.querySelectorAll('.co-mobile-tabbar a')).map((a) =>
      a.textContent?.trim(),
    );
    expect(tabs).toEqual(['Dashboard', 'Campaigns', 'Submissions']);
    expect(element.querySelector('.co-mobile-tabbar .co-tabbar-action')).toBeTruthy();

    // No drawer button for a clipper: the chip carries the account menu.
    expect(element.querySelector('header button[aria-label="Open menu"]')).toBeNull();
    const chip = element.querySelector<HTMLButtonElement>('header button[aria-haspopup="menu"]');
    expect(chip?.textContent).toContain('Cara Creator');
    expect(chip?.textContent).toContain('CC');

    chip?.click();
    fixture.detectChanges();
    expect(element.querySelector('header [role="menu"]')?.textContent).toContain(
      'creator@clapout.test',
    );
    element.querySelector<HTMLButtonElement>('header [role="menuitem"]')?.click();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('exposes account actions from the avatar button', async () => {
    const { auth, element, fixture } = await render(adminUser);

    const accountButton = element.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
    accountButton?.click();
    fixture.detectChanges();

    expect(element.querySelector('[role="menu"]')?.textContent).toContain('admin@clapout.test');

    element.querySelector<HTMLButtonElement>('[role="menuitem"]')?.click();
    expect(auth.signOut).toHaveBeenCalledOnce();

    // Signing out lands on the sign-in screen, not the public campaign list.
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/auth/sign-in');
  });
});
