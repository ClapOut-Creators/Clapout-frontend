import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { APP_ENVIRONMENT } from '../config/app-environment';
import {
  AdminInquiryQuery,
  AdminInquiryUpdate,
  AdminRegistration,
  AdminRegistrationQuery,
  AdminStats,
  AdminSubmission,
  AdminSubmissionQuery,
  AdminSubmissionUpdate,
  CampaignDraftInput,
  PartnershipInquiry,
} from '../models/admin';
import { Brand, BrandDetail, BrandInput } from '../models/brand';
import {
  BrandInvite,
  BrandInviteEmailWarning,
  BrandInviteQuery,
  CreateBrandInviteInput,
  CreatedBrandInvite,
} from '../models/brand-invite';
import { PublicCampaign } from '../models/campaign';
import { RegistrationStatus } from '../models/registration';
import { SubmissionViewCheck, SubmissionViewCheckInput } from '../models/submission';

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

  /**
   * `POST /admin/campaigns/:slug/reopen` — undoes a close. No completeness
   * gate (the campaign was already public); 422 when the campaign isn't CLOSED.
   */
  async reopenCampaign(slug: string): Promise<PublicCampaign> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: PublicCampaign }>(
          `${this.baseUrl}/campaigns/${encodeURIComponent(slug)}/reopen`,
          {},
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

  // --------------------------------------------------------- brand invites

  /**
   * `GET /admin/brand-invites?status=&search=` — newest first. `status`
   * accepts the computed EXPIRED as well as the three stored ones.
   */
  async brandInvites(query: BrandInviteQuery = {}): Promise<BrandInvite[]> {
    let params = new HttpParams();
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: BrandInvite[] }>(`${this.baseUrl}/brand-invites`, { params }),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `GET /admin/brand-invites/:id` — `404 INVITE_NOT_FOUND`. */
  async brandInvite(id: string): Promise<BrandInvite> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: BrandInvite }>(
          `${this.baseUrl}/brand-invites/${encodeURIComponent(id)}`,
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /admin/brand-invites` — returns the token the platform composes the
   * link from. An `inquiryId` also moves a NEW inquiry to CONTACTED
   * (`422 INQUIRY_NOT_FOUND` when the inquiry is unknown).
   *
   * With `sendEmail` the API also mails the link. A refused send does not fail
   * the create, so the envelope's `warning` sibling rides back beside the
   * invite rather than being thrown: the link exists either way and the admin
   * decides whether to retry or send it themselves.
   */
  async createBrandInvite(input: CreateBrandInviteInput): Promise<CreatedBrandInvite> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: BrandInvite; warning?: BrandInviteEmailWarning }>(
          `${this.baseUrl}/brand-invites`,
          input,
        ),
      );
      return { invite: response.data, warning: response.warning ?? undefined };
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /admin/brand-invites/:id/send-email` — mails the link. `to` wins over
   * the invite's `contactEmail` and is stored as it when the invite had none.
   * Only a live invite can be emailed (`409 INVITE_NOT_PENDING`);
   * `422 INVITE_EMAIL_MISSING` when there is no address at all, `422 VALIDATION`
   * for a bad one, and `502 EMAIL_FAILED` carrying Resend's own reason.
   */
  async sendBrandInviteEmail(id: string, to?: string | null): Promise<BrandInvite> {
    const address = to?.trim();
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: BrandInvite }>(
          `${this.baseUrl}/brand-invites/${encodeURIComponent(id)}/send-email`,
          address ? { to: address } : {},
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /admin/brand-invites/:id/revoke` — PENDING becomes REVOKED;
   * `409 INVITE_NOT_PENDING` for anything else.
   */
  async revokeBrandInvite(id: string): Promise<BrandInvite> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: BrandInvite }>(
          `${this.baseUrl}/brand-invites/${encodeURIComponent(id)}/revoke`,
          {},
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `DELETE /admin/brand-invites/:id` — `409 INVITE_HAS_BRAND` while the
   * invite still points at a brand, so the brand has to go first.
   */
  async deleteBrandInvite(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.baseUrl}/brand-invites/${encodeURIComponent(id)}`),
      );
    } catch (error) {
      throw toApiError(error);
    }
  }

  // ----------------------------------------------------------- submissions

  /** `GET /admin/submissions` — newest first. Filters are applied server side. */
  async submissions(query: AdminSubmissionQuery = {}): Promise<AdminSubmission[]> {
    let params = new HttpParams();
    if (query.campaignSlug) {
      params = params.set('campaignSlug', query.campaignSlug);
    }
    if (query.brandId) {
      params = params.set('brandId', query.brandId);
    }
    if (query.registrationId) {
      params = params.set('registrationId', query.registrationId);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.staleViewsDays !== undefined) {
      params = params.set('staleViewsDays', String(query.staleViewsDays));
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ data: AdminSubmission[] }>(`${this.baseUrl}/submissions`, { params }),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `PATCH /admin/submissions/:id` — moves a clip through review. APPROVED
   * needs `verifiedViews` and a campaign CPM (`422 CAMPAIGN_CPM_MISSING`);
   * PAID needs the row to be APPROVED already (`422 NOT_APPROVED`).
   */
  async updateSubmission(id: string, body: AdminSubmissionUpdate): Promise<AdminSubmission> {
    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: AdminSubmission }>(
          `${this.baseUrl}/submissions/${encodeURIComponent(id)}`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /admin/submissions/:id/view-checks` — re-verifies an approved clip.
   * Writes a history row, moves `verifiedViews` and `viewsCheckedAt`, and
   * refreezes the payout from the campaign's CPM (`409 CAMPAIGN_CPM_MISSING`
   * when there is none). Only APPROVED rows qualify: a paid clip answers
   * `409 SUBMISSION_PAID`, anything else `409 SUBMISSION_NOT_APPROVED`.
   */
  async recordViewCheck(id: string, body: SubmissionViewCheckInput): Promise<AdminSubmission> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: AdminSubmission }>(
          `${this.baseUrl}/submissions/${encodeURIComponent(id)}/view-checks`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `GET /admin/submissions/:id/view-checks` — newest first. */
  async viewChecks(id: string): Promise<SubmissionViewCheck[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: SubmissionViewCheck[] }>(
          `${this.baseUrl}/submissions/${encodeURIComponent(id)}/view-checks`,
        ),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }

  // ------------------------------------------------------------- inquiries

  /** `GET /admin/partnership-inquiries` — newest first. */
  async inquiries(query: AdminInquiryQuery = {}): Promise<PartnershipInquiry[]> {
    let params = new HttpParams();
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.search) {
      params = params.set('search', query.search);
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ data: PartnershipInquiry[] }>(`${this.baseUrl}/partnership-inquiries`, {
          params,
        }),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `GET /admin/partnership-inquiries/:id` — `404 INQUIRY_NOT_FOUND`. */
  async inquiry(id: string): Promise<PartnershipInquiry> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: PartnershipInquiry }>(
          `${this.baseUrl}/partnership-inquiries/${encodeURIComponent(id)}`,
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `PATCH /admin/partnership-inquiries/:id` — status, admin note and the
   * brand a converted inquiry became (`422 BRAND_NOT_FOUND` when unknown).
   */
  async updateInquiry(id: string, body: AdminInquiryUpdate): Promise<PartnershipInquiry> {
    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: PartnershipInquiry }>(
          `${this.baseUrl}/partnership-inquiries/${encodeURIComponent(id)}`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }
}
