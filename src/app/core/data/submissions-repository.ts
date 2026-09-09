import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { APP_ENVIRONMENT } from '../config/app-environment';
import { CreateSubmissionPayload, CreatorStats, Submission } from '../models/submission';

/** Typed HTTP access to a clipper's content submissions. Every call needs a session. */
@Injectable({ providedIn: 'root' })
export class SubmissionsRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_ENVIRONMENT).apiBaseUrl;

  /**
   * `POST /submissions` — 404 REGISTRATION_NOT_FOUND, 422
   * REGISTRATION_NOT_ACCEPTED / SUBMISSIONS_CLOSED /
   * POST_URL_PLATFORM_MISMATCH / VALIDATION and 409 DUPLICATE_SUBMISSION all
   * surface as `ApiError.code`.
   */
  async create(payload: CreateSubmissionPayload): Promise<Submission> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: Submission }>(`${this.baseUrl}/submissions`, payload),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `GET /me/submissions?registrationId=` — newest first, as returned by the API. */
  async listMine(registrationId?: string): Promise<Submission[]> {
    let params = new HttpParams();
    if (registrationId) {
      params = params.set('registrationId', registrationId);
    }
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: Submission[] }>(`${this.baseUrl}/me/submissions`, { params }),
      );
      return response.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * `DELETE /me/submissions/:id` — withdraw a clip while it is still
   * SUBMITTED. `409 SUBMISSION_LOCKED` once a reviewer has touched it.
   */
  async remove(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.baseUrl}/me/submissions/${encodeURIComponent(id)}`),
      );
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** `GET /me/stats` — the clipper's headline numbers. */
  async stats(): Promise<CreatorStats> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: CreatorStats }>(`${this.baseUrl}/me/stats`),
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }
}
