import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../../core/api/api-error';
import { APP_ENVIRONMENT } from '../../../core/config/app-environment';
import { RegistrationStatus } from '../models/registration';
import { AdminRegistration, AdminRegistrationQuery } from '../models/registration-admin';

/**
 * Typed HTTP access to `/admin/registrations/*`. Every call requires a
 * session whose user has role ADMIN; the API answers `403 FORBIDDEN`
 * otherwise.
 */
@Injectable({ providedIn: 'root' })
export class RegistrationsAdminRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_ENVIRONMENT).apiBaseUrl}/admin/registrations`;

  /** `GET /admin/registrations` — newest first. Filters are applied server side. */
  async registrations(query: AdminRegistrationQuery = {}): Promise<AdminRegistration[]> {
    let params = new HttpParams();
    if (query.brandId) {
      params = params.set('brandId', query.brandId);
    }
    if (query.campaignSlug) {
      params = params.set('campaignSlug', query.campaignSlug);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.search) {
      params = params.set('search', query.search);
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ data: AdminRegistration[] }>(this.baseUrl, { params }),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `PATCH /admin/registrations/:id` — moves an application through review. */
  async updateRegistrationStatus(
    id: string,
    status: RegistrationStatus,
  ): Promise<AdminRegistration> {
    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: AdminRegistration }>(`${this.baseUrl}/${encodeURIComponent(id)}`, {
          status,
        }),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }
}
