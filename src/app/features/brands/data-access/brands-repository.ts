import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../../core/api/api-error';
import { APP_ENVIRONMENT } from '../../../core/config/app-environment';
import { Brand, BrandDetail, BrandInput } from '../models/brand';

/**
 * Typed HTTP access to `/admin/brands/*`. Every call requires a session whose
 * user has role ADMIN; the API answers `403 FORBIDDEN` otherwise.
 */
@Injectable({ providedIn: 'root' })
export class BrandsRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_ENVIRONMENT).apiBaseUrl}/admin/brands`;

  /** `GET /admin/brands?search=` — name ascending. */
  async brands(search?: string): Promise<Brand[]> {
    let params = new HttpParams();
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: Brand[] }>(this.baseUrl, { params }),
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
        this.http.get<{ data: BrandDetail }>(`${this.baseUrl}/${encodeURIComponent(id)}`),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `POST /admin/brands` — `409 BRAND_EXISTS` on a duplicate name. */
  async createBrand(input: BrandInput): Promise<Brand> {
    try {
      const response = await firstValueFrom(this.http.post<{ data: Brand }>(this.baseUrl, input));
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `PATCH /admin/brands/:id` — partial, `status` included. */
  async updateBrand(id: string, input: Partial<BrandInput>): Promise<Brand> {
    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: Brand }>(`${this.baseUrl}/${encodeURIComponent(id)}`, input),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `DELETE /admin/brands/:id` — `409 BRAND_IN_USE` when campaigns reference it. */
  async deleteBrand(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`));
    } catch (error) {
      throw toApiError(error);
    }
  }
}
