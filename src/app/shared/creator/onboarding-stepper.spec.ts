import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth-service';
import { Me, ProfilePatch } from '../../core/models/user';
import { OnboardingStepper } from './onboarding-stepper';

const creator: Me = {
  id: 'creator-1',
  email: 'cara@clapout.test',
  fullName: 'Cara Creator',
  role: 'CREATOR',
  phone: null,
  whatsapp: null,
  socials: [],
  payout: null,
  communityJoinedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
};

/** Records every `PATCH /me` body and applies it to the session copy. */
function authDouble(user: Me) {
  const currentUser = signal<Me>(user);
  const patches: ProfilePatch[] = [];
  return {
    user: currentUser.asReadonly(),
    patches,
    updateProfile: async (patch: ProfilePatch) => {
      patches.push(patch);
      currentUser.update((current) => ({
        ...current,
        ...(patch.socials ? { socials: patch.socials } : {}),
        ...(patch.communityJoined ? { communityJoinedAt: '2026-09-09T12:00:00.000Z' } : {}),
      }));
      return currentUser();
    },
  };
}

describe('OnboardingStepper', () => {
  let auth: ReturnType<typeof authDouble>;
  let finished: number;

  async function render(user: Me = creator) {
    auth = authDouble(user);
    finished = 0;
    await TestBed.configureTestingModule({
      imports: [OnboardingStepper],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();

    const fixture = TestBed.createComponent(OnboardingStepper);
    fixture.componentInstance.finished.subscribe(() => finished++);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  function text(fixture: { nativeElement: HTMLElement }): string {
    return fixture.nativeElement.textContent ?? '';
  }

  function button(fixture: { nativeElement: HTMLElement }, label: string): HTMLButtonElement {
    const match = Array.from(fixture.nativeElement.querySelectorAll('button')).find((node) =>
      node.textContent?.includes(label),
    );
    if (!match) {
      throw new Error(`No button labelled "${label}"`);
    }
    return match;
  }

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('refuses to move on without at least one valid social link', async () => {
    const fixture = await render();

    button(fixture, 'Save and continue').click();
    await settle(fixture);

    expect(text(fixture)).toContain('Step 1 of 3');
    expect(text(fixture)).toContain('Add the link, or remove this row.');
    expect(auth.patches).toEqual([]);
  });

  it('saves the socials, then unlocks the join confirmation only after the invite is opened', async () => {
    const fixture = await render();
    const input = fixture.nativeElement.querySelector('input[type="url"]') as HTMLInputElement;
    input.value = 'https://www.tiktok.com/@cara';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);

    button(fixture, 'Save and continue').click();
    await settle(fixture);

    expect(auth.patches).toEqual([{ socials: [{ url: 'https://www.tiktok.com/@cara' }] }]);
    expect(text(fixture)).toContain('Step 2 of 3');

    const confirm = button(fixture, 'I have joined');
    expect(confirm.disabled).toBe(true);

    const invite = fixture.nativeElement.querySelector('a[target="_blank"]') as HTMLAnchorElement;
    expect(invite.href).toContain('chat.whatsapp.com');
    invite.addEventListener('click', (event) => event.preventDefault());
    invite.click();
    await settle(fixture);

    expect(button(fixture, 'I have joined').disabled).toBe(false);
    button(fixture, 'I have joined').click();
    await settle(fixture);

    expect(auth.patches[1]).toEqual({ communityJoined: true });
    expect(text(fixture)).toContain('Step 3 of 3');

    button(fixture, 'Browse campaigns').click();
    expect(finished).toBe(1);
  });

  it('seeds saved socials for a returning creator and skips the request when nothing changed', async () => {
    const fixture = await render({
      ...creator,
      socials: [{ url: 'https://www.instagram.com/cara' }],
    });

    const input = fixture.nativeElement.querySelector('input[type="url"]') as HTMLInputElement;
    expect(input.value).toBe('https://www.instagram.com/cara');

    button(fixture, 'Save and continue').click();
    await settle(fixture);

    expect(auth.patches).toEqual([]);
    expect(text(fixture)).toContain('Step 2 of 3');
  });
});
