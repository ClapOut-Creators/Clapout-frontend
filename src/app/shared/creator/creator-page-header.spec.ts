import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth-service';
import { Me } from '../../core/models/user';
import { CreatorPageHeader } from './creator-page-header';

const creator: Me = {
  id: 'creator-1',
  email: 'cara@clapout.test',
  fullName: 'Cara Creator',
  role: 'CREATOR',
  phone: null,
  whatsapp: null,
  socials: [],
  payout: null,
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
  async function render(crumbs: string[], user: Me | null = creator) {
    await TestBed.configureTestingModule({
      imports: [CreatorPageHeader],
      providers: [{ provide: AuthService, useValue: authDouble(user) }],
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

  it('shows the signed-in name and its initials', async () => {
    const element = await render(['Dashboard']);

    expect(element.textContent).toContain('Cara Creator');
    expect(element.textContent).toContain('CC');
  });

  it('falls back to the email local part when the profile has no name', async () => {
    const element = await render(['Dashboard'], { ...creator, fullName: '' });

    expect(element.textContent).toContain('cara');
    expect(element.textContent).toContain('C');
  });

  it('stays renderable with no session at all', async () => {
    const element = await render(['Dashboard'], null);

    expect(element.textContent).toContain('Your account');
  });
});
