import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { APP_ENVIRONMENT } from '../config/app-environment';
import { PublicCampaign } from '../models/campaign';

/** Typed HTTP access to the public campaign endpoints (no auth required). */
@Injectable({ providedIn: 'root' })
export class CampaignsRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_ENVIRONMENT).apiBaseUrl}/public/campaigns`;

  /** `GET /public/campaigns` */
  async list(): Promise<PublicCampaign[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: PublicCampaign[] }>(this.baseUrl),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `GET /public/campaigns/:slug` — throws an `ApiError` with status 404 when unknown. */
  async bySlug(slug: string): Promise<PublicCampaign> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: PublicCampaign }>(`${this.baseUrl}/${encodeURIComponent(slug)}`),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }
}
