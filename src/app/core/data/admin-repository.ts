import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { APP_ENVIRONMENT } from '../config/app-environment';
import {
  AdminRegistration,
  AdminRegistrationQuery,
  AdminStats,
  CampaignDraftInput,
} from '../models/admin';
import { PublicCampaign } from '../models/campaign';
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

  /** `GET /admin/campaigns` — includes DRAFT rows the public API hides. */
  async campaigns(): Promise<PublicCampaign[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: PublicCampaign[] }>(`${this.baseUrl}/campaigns`),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `GET /admin/campaigns/:slug` via the admin list — drafts are not public. */
  async campaignBySlug(slug: string): Promise<PublicCampaign | null> {
    const all = await this.campaigns();
    return all.find((campaign) => campaign.slug === slug) ?? null;
  }

  /** `POST /admin/campaigns` — always creates a DRAFT. */
  async createCampaign(input: CampaignDraftInput): Promise<PublicCampaign> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: PublicCampaign }>(`${this.baseUrl}/campaigns`, input),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `PATCH /admin/campaigns/:slug` — partial update. */
  async updateCampaign(slug: string, input: Partial<CampaignDraftInput>): Promise<PublicCampaign> {
    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: PublicCampaign }>(
          `${this.baseUrl}/campaigns/${encodeURIComponent(slug)}`,
          input,
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /admin/campaigns/:slug/publish` — throws `ApiError` with code
   * `INCOMPLETE` (422) listing the fields that still need values.
   */
  async publishCampaign(slug: string): Promise<PublicCampaign> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: PublicCampaign }>(
          `${this.baseUrl}/campaigns/${encodeURIComponent(slug)}/publish`,
          {},
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `POST /admin/campaigns/:slug/close` */
  async closeCampaign(slug: string): Promise<PublicCampaign> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: PublicCampaign }>(
          `${this.baseUrl}/campaigns/${encodeURIComponent(slug)}/close`,
          {},
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }
}
