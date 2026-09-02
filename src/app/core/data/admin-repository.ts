import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { APP_ENVIRONMENT } from '../config/app-environment';
import { AdminRegistration, AdminRegistrationQuery, AdminStats } from '../models/admin';
import { Brand, BrandDetail, BrandInput } from '../models/brand';
import { RegistrationStatus } from '../models/registration';

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
        this.http.get<{ data: AdminRegistration[] }>(`${this.baseUrl}/registrations`, { params }),
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
        this.http.patch<{ data: AdminRegistration }>(
          `${this.baseUrl}/registrations/${encodeURIComponent(id)}`,
          { status },
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  // ---------------------------------------------------------------- brands

  /** `GET /admin/brands?search=` — name ascending. */
  async brands(search?: string): Promise<Brand[]> {
    let params = new HttpParams();
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: Brand[] }>(`${this.baseUrl}/brands`, { params }),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `GET /admin/brands/:id` — includes stats and the brand's campaigns. */
  async brand(id: string): Promise<BrandDetail> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: BrandDetail }>(`${this.baseUrl}/brands/${encodeURIComponent(id)}`),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `POST /admin/brands` — `409 BRAND_EXISTS` on a duplicate name. */
  async createBrand(input: BrandInput): Promise<Brand> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: Brand }>(`${this.baseUrl}/brands`, input),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `PATCH /admin/brands/:id` — partial, `status` included. */
  async updateBrand(id: string, input: Partial<BrandInput>): Promise<Brand> {
    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: Brand }>(`${this.baseUrl}/brands/${encodeURIComponent(id)}`, input),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `DELETE /admin/brands/:id` — `409 BRAND_IN_USE` when campaigns reference it. */
  async deleteBrand(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.baseUrl}/brands/${encodeURIComponent(id)}`),
      );
    } catch (error) {
      throw toApiError(error);
    }
  }
}
