import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
        provideRouter([{ path: 'campaigns', component: EmptyRoute }]),
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

  it('exposes account actions from the avatar button', async () => {
    const { auth, element, fixture } = await render(adminUser);

    const accountButton = element.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
    accountButton?.click();
    fixture.detectChanges();

    expect(element.querySelector('[role="menu"]')?.textContent).toContain('Ada Admin');

    element.querySelector<HTMLButtonElement>('[role="menuitem"]')?.click();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});
