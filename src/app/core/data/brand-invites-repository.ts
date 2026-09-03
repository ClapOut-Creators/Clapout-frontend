import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { APP_ENVIRONMENT } from '../config/app-environment';
import {
  CompleteBrandInvitePayload,
  CompletedBrandInvite,
  PublicBrandInvite,
} from '../models/brand-invite';

/**
 * The two public brand-invite endpoints (`/public/brand-invites/:token`). No
 * auth: the token in the link is the credential, so nothing here may be given
 * a session — a signed-in admin opening a link must see exactly what the
 * brand's representative sees.
 */
@Injectable({ providedIn: 'root' })
export class BrandInvitesRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_ENVIRONMENT).apiBaseUrl}/public/brand-invites`;

  /**
   * `GET /public/brand-invites/:token` — `404 INVITE_NOT_FOUND` for an unknown
   * token. A used, revoked or expired invite still answers 200 carrying that
   * status, so the page can explain what happened rather than 404-ing.
   */
  async byToken(token: string): Promise<PublicBrandInvite> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: PublicBrandInvite }>(`${this.baseUrl}/${encodeURIComponent(token)}`),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `POST /public/brand-invites/:token/complete` — creates the brand and marks
   * the invite COMPLETED in one transaction. Throws `ApiError` for
   * `409 BRAND_EXISTS`, the `410 INVITE_USED | INVITE_REVOKED | INVITE_EXPIRED`
   * dead-link family, `422 VALIDATION` and `429 RATE_LIMITED`.
   */
  async complete(
    token: string,
    payload: CompleteBrandInvitePayload,
  ): Promise<CompletedBrandInvite> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: CompletedBrandInvite }>(
          `${this.baseUrl}/${encodeURIComponent(token)}/complete`,
          payload,
        ),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }
}
