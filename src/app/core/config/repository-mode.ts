import { inject } from '@angular/core';
import { APP_ENVIRONMENT } from './app-environment';

export type RepositoryMode = 'mock' | 'http';

export function repositoryMode(): RepositoryMode {
  return inject(APP_ENVIRONMENT).useMockAdapters ? 'mock' : 'http';
}
