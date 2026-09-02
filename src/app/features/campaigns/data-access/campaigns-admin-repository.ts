import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../../core/api/api-error';
import { APP_ENVIRONMENT } from '../../../core/config/app-environment';
import { PublicCampaign } from '../models/campaign';
import { CampaignDraftInput } from '../models/campaign-admin';

/**
 * Typed HTTP access to `/admin/campaigns/*`. Every call requires a session
 * whose user has role ADMIN; the API answers `403 FORBIDDEN` otherwise.
 */
@Injectable({ providedIn: 'root' })
export class CampaignsAdminRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_ENVIRONMENT).apiBaseUrl}/admin/campaigns`;

  /** `GET /admin/campaigns` — includes DRAFT rows the public API hides. */
  async campaigns(): Promise<PublicCampaign[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: PublicCampaign[] }>(this.baseUrl),
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
        this.http.post<{ data: PublicCampaign }>(this.baseUrl, input),
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
          `${this.baseUrl}/${encodeURIComponent(slug)}`,
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
          `${this.baseUrl}/${encodeURIComponent(slug)}/publish`,
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
          `${this.baseUrl}/${encodeURIComponent(slug)}/close`,
          {},
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /admin/campaigns/:slug/reopen` — undoes a close. No completeness
   * gate (the campaign was already public); 422 when the campaign isn't CLOSED.
   */
  async reopenCampaign(slug: string): Promise<PublicCampaign> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: PublicCampaign }>(
          `${this.baseUrl}/${encodeURIComponent(slug)}/reopen`,
          {},
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }
}
