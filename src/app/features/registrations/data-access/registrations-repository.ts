import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../../core/api/api-error';
import { APP_ENVIRONMENT } from '../../../core/config/app-environment';
import { CreateRegistrationPayload, Registration } from '../models/registration';

/** Typed HTTP access to campaign applications. Every call requires a session. */
@Injectable({ providedIn: 'root' })
export class RegistrationsRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_ENVIRONMENT).apiBaseUrl;

  /**
   * `POST /registrations` — 404 CAMPAIGN_NOT_FOUND, 409 ALREADY_REGISTERED and
   * 422 REGISTRATION_CLOSED surface as `ApiError.code`.
   */
  async create(payload: CreateRegistrationPayload): Promise<Registration> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: Registration }>(`${this.baseUrl}/registrations`, payload),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `GET /me/registrations` — newest first, as returned by the API. */
  async listMine(): Promise<Registration[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: Registration[] }>(`${this.baseUrl}/me/registrations`),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }
}
