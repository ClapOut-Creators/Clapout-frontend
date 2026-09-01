import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { authInterceptor } from './core/auth/auth-interceptor';
import { AuthService } from './core/auth/auth-service';
import { provideAppConfiguration } from './core/config/app-environment';
import { clapoutPreset } from './core/theme/clapout-preset';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    providePrimeNG({
      // PrimeUI Community license (free tier, renewable yearly). Ships in the
      // client bundle by design — not a secret.
      license:
        'eyJpZCI6IjZiYjE2ZWFiLWU1NDgtNGMxMS1hODM4LTA4NDE1N2RkMzhiYiIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODgyMjkyODIsImV4cCI6MTgxOTc2NTI4Mn0.462ePoOwDqIOQ0wX-fDeivN2wRlbuX7KAaIU9OqtCGUugtczUQBUbArgrCVqYVcoUwBrMhxH38mPbzkiFU5fAg',
      ripple: true,
      theme: {
        preset: clapoutPreset,
        options: {
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng, utilities',
          },
          darkModeSelector: false,
        },
      },
    }),
    MessageService,
    ConfirmationService,
    // TODO: swap `apiBaseUrl` for the deployed API origin when the backend is
    // hosted (build-time replacement or a runtime config fetch).
    provideAppConfiguration({
      apiBaseUrl: 'http://localhost:4000/api/v1',
      apiReadiness: 'INTEGRATED',
      useMockAdapters: false,
    }),
    // Rehydrate the stored session in the background; guards await the same
    // promise so a slow /me never blocks the first paint.
    provideAppInitializer(() => {
      void inject(AuthService).bootstrap();
    }),
  ],
};
