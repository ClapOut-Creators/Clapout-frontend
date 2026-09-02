import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { APP_ENVIRONMENT } from '../config/app-environment';
import { AdminStats } from '../models/admin';

/**
 * Typed HTTP access to `/admin/*`. Every call requires a session whose user has
 * role ADMIN; the API answers `403 FORBIDDEN` otherwise.
 */
@Injectable({ providedIn: 'root' })
export class AdminRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_ENVIRONMENT).apiBaseUrl}/admin`;

  /** `GET /admin/stats` */
  async stats(): Promise<AdminStats> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: AdminStats }>(`${this.baseUrl}/stats`),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }
}
