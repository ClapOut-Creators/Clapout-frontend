import { InjectionToken, makeEnvironmentProviders } from '@angular/core';

export type ApiReadiness = 'MOCKED' | 'CONTRACT_READY' | 'INTEGRATED' | 'BLOCKED';

export interface AppEnvironment {
  readonly apiBaseUrl: string;
  readonly apiReadiness: ApiReadiness;
  readonly useMockAdapters: boolean;
}

export const CLAPOUT_ENVIRONMENT: AppEnvironment = {
  apiBaseUrl: '/api',
  apiReadiness: 'MOCKED',
  useMockAdapters: true,
};

export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');

export function provideAppConfiguration(environment: AppEnvironment = CLAPOUT_ENVIRONMENT) {
  return makeEnvironmentProviders([
    {
      provide: APP_ENVIRONMENT,
      useValue: environment,
    },
  ]);
}
