import { provideHttpClient } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from './core/auth/auth-service';
import { provideAppConfiguration } from './core/config/app-environment';
import { Me } from './core/models/user';
import { App } from './app';

@Component({ template: '' })
class EmptyRoute {}

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
  emailVerifiedAt: null,
  createdAt: '2026-09-12T07:00:00.000Z',
};

/** A signed-in clipper, as the shell and the side nav see one. */
function signedInDouble() {
  const user = signal<Me | null>(creator);
  return {
    user: user.asReadonly(),
    isSignedIn: computed(() => user() !== null),
    isAdmin: computed(() => user()?.role === 'ADMIN'),
    signOut: vi.fn(() => user.set(null)),
  };
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        ConfirmationService,
        MessageService,
        provideAppConfiguration(),
        provideHttpClient(),
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render global overlay hosts and router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('p-toast')).toBeTruthy();
    expect(compiled.querySelector('p-confirmdialog')).toBeTruthy();
  });
});

describe('App shell for a signed-in clipper', () => {
  async function renderAt(url: string) {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [App],
        providers: [
          ConfirmationService,
          MessageService,
          provideAppConfiguration(),
          provideHttpClient(),
          provideRouter([
            { path: 'creator/onboarding', component: EmptyRoute },
            { path: 'creator/dashboard', component: EmptyRoute },
            { path: 'auth/verify-email', component: EmptyRoute },
          ]),
          { provide: AuthService, useValue: signedInDouble() },
        ],
      })
      .compileComponents();

    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('draws the side nav on the dashboard', async () => {
    const element = await renderAt('/creator/dashboard');
    expect(element.querySelector('app-side-nav')).toBeTruthy();
  });

  it('hides the side nav while the clipper is still verifying and onboarding', async () => {
    // Nothing to navigate to until the steps are done: the rail would only
    // offer ways around them.
    expect((await renderAt('/creator/onboarding')).querySelector('app-side-nav')).toBeNull();
    expect((await renderAt('/auth/verify-email?token=x')).querySelector('app-side-nav')).toBeNull();
  });
});
