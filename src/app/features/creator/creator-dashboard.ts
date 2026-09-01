import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { RegistrationsRepository } from '../../core/data/registrations-repository';
import { Registration } from '../../core/models/registration';
import {
  daysLeftLabel,
  formatDate,
  formatMoney,
  platformLabel,
  registrationStatusLabel,
  registrationStatusTone,
} from '../../core/util/campaign-format';

type DashboardState = 'loading' | 'ready' | 'error';

/** Guarded creator home: profile completeness plus every campaign application. */
@Component({
  imports: [ButtonModule, MessageModule, RouterLink, SkeletonModule, TagModule],
  selector: 'app-creator-dashboard',
  templateUrl: './creator-dashboard.html',
})
export class CreatorDashboard {
  private readonly registrations = inject(RegistrationsRepository);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly state = signal<DashboardState>('loading');
  protected readonly applications = signal<Registration[]>([]);
  protected readonly errorMessage = signal<string>('');
  protected readonly skeletonRows = [0, 1, 2];

  /** Copy-only nudge until the profile screens ship in a later phase. */
  protected readonly profileIncomplete = computed(() => {
    const user = this.user();
    return !!user && (user.socials.length === 0 || user.payout === null);
  });

  protected readonly daysLeftLabel = daysLeftLabel;
  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly platformLabel = platformLabel;
  protected readonly registrationStatusLabel = registrationStatusLabel;
  protected readonly registrationStatusTone = registrationStatusTone;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.applications.set(await this.registrations.listMine());
      this.state.set('ready');
    } catch (error) {
      this.applications.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load your applications.',
      );
      this.state.set('error');
    }
  }

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigate(['/campaigns']);
  }
}
