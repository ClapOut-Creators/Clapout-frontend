import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Copy } from '@primeicons/angular/copy';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { BrandInvite, BrandInviteStatus } from '../../core/models/brand-invite';
import { Option } from '../../core/util/admin-options';
import { brandInviteLink } from '../../core/util/brand-invite-link';
import {
  brandInviteStatusLabel,
  brandInviteStatusTone,
  formatDate,
  NOT_ANNOUNCED,
} from '../../core/util/campaign-format';

type TableState = 'loading' | 'ready' | 'error';

const STATUS_OPTIONS: Option<BrandInviteStatus | null>[] = [
  { label: 'All', value: null },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Revoked', value: 'REVOKED' },
];

/** `409` from DELETE while the invite still points at the brand it created. */
const INVITE_HAS_BRAND = 'INVITE_HAS_BRAND';

/**
 * The "Brand invites" section under the brand list: who was invited, whether
 * they finished, and the three things an admin does with a live link — copy it
 * again, revoke it, or delete the row once it is spent.
 *
 * Owns its own fetch (`GET /admin/brand-invites?status=`) so the host only has
 * to place it and call {@link reload} after issuing a new invite.
 */
@Component({
  imports: [
    ButtonModule,
    Copy,
    FormsModule,
    MessageModule,
    RouterLink,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
  ],
  selector: 'app-brand-invites-table',
  templateUrl: './brand-invites-table.html',
})
export class BrandInvitesTable {
  private readonly admin = inject(AdminRepository);
  private readonly messages = inject(MessageService);
  private readonly confirmations = inject(ConfirmationService);

  protected readonly state = signal<TableState>('loading');
  protected readonly rows = signal<BrandInvite[]>([]);
  protected readonly errorMessage = signal('');
  protected readonly statusFilter = signal<BrandInviteStatus | null>(null);
  /** Ids with a request in flight, so only that row's buttons disable. */
  protected readonly busyIds = signal<ReadonlySet<string>>(new Set());
  /** The row whose link was copied last, for the transient "Copied" label. */
  protected readonly copiedId = signal<string | null>(null);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly skeletonRows = [0, 1, 2];
  protected readonly notAnnounced = NOT_ANNOUNCED;
  protected readonly formatDate = formatDate;
  protected readonly statusLabel = brandInviteStatusLabel;
  protected readonly statusTone = brandInviteStatusTone;

  protected readonly hasFilter = computed(() => this.statusFilter() !== null);
  protected readonly filterLabel = computed(() => {
    const status = this.statusFilter();
    return status ? brandInviteStatusLabel(status).toLowerCase() : '';
  });
  protected readonly countLabel = computed(() => {
    const total = this.rows().length;
    return `${total} ${total === 1 ? 'invite' : 'invites'}`;
  });

  constructor() {
    effect(() => {
      void this.load(this.statusFilter());
    });
  }

  /** Called by the host after an invite is created, revoked or deleted elsewhere. */
  reload(): void {
    void this.load(this.statusFilter());
  }

  protected clearFilter(): void {
    this.statusFilter.set(null);
  }

  protected isBusy(id: string): boolean {
    return this.busyIds().has(id);
  }

  protected linkFor(invite: BrandInvite): string {
    return brandInviteLink(invite.token);
  }

  protected async copyLink(invite: BrandInvite): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.linkFor(invite));
      this.copiedId.set(invite.id);
      setTimeout(() => {
        if (this.copiedId() === invite.id) {
          this.copiedId.set(null);
        }
      }, 2000);
      this.messages.add({
        severity: 'success',
        summary: 'Link copied',
        detail: 'Send it to the brand on WhatsApp or by email.',
      });
    } catch {
      this.messages.add({
        severity: 'warn',
        summary: 'Could not copy',
        detail: 'Your browser refused clipboard access. Open the invite and copy it by hand.',
      });
    }
  }

  protected confirmRevoke(invite: BrandInvite): void {
    if (this.isBusy(invite.id)) {
      return;
    }
    this.confirmations.confirm({
      header: 'Revoke this invite',
      message: `The link stops working immediately${
        invite.brandName ? ` and ${invite.brandName} will have to ask for a new one` : ''
      }. Revoke it?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Revoke',
      rejectLabel: 'Keep it',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => void this.revoke(invite),
    });
  }

  protected confirmDelete(invite: BrandInvite): void {
    if (this.isBusy(invite.id)) {
      return;
    }
    this.confirmations.confirm({
      header: 'Delete this invite',
      message: 'The row disappears from this list. This cannot be undone.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => void this.remove(invite),
    });
  }

  private async revoke(invite: BrandInvite): Promise<void> {
    this.markBusy(invite.id, true);
    try {
      const updated = await this.admin.revokeBrandInvite(invite.id);
      this.rows.update((rows) => rows.map((row) => (row.id === invite.id ? updated : row)));
      this.messages.add({
        severity: 'success',
        summary: 'Invite revoked',
        detail: 'That link no longer opens the onboarding page.',
      });
      // A status filter may no longer match this row, so re-ask the API.
      this.reload();
    } catch (error) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not revoke invite',
        detail:
          error instanceof ApiError && error.status === 409
            ? 'That invite is no longer pending — refresh to see its current state.'
            : error instanceof ApiError
              ? error.message
              : 'Please try again in a moment.',
      });
    } finally {
      this.markBusy(invite.id, false);
    }
  }

  private async remove(invite: BrandInvite): Promise<void> {
    this.markBusy(invite.id, true);
    try {
      await this.admin.deleteBrandInvite(invite.id);
      this.rows.update((rows) => rows.filter((row) => row.id !== invite.id));
      this.messages.add({
        severity: 'success',
        summary: 'Invite deleted',
        detail: 'The invite has been removed.',
      });
    } catch (error) {
      const hasBrand =
        error instanceof ApiError && (error.status === 409 || error.code === INVITE_HAS_BRAND);
      this.messages.add({
        severity: 'error',
        summary: 'Could not delete invite',
        detail: hasBrand
          ? 'This invite created a brand. Delete the brand first, then the invite.'
          : error instanceof ApiError
            ? error.message
            : 'Please try again in a moment.',
      });
    } finally {
      this.markBusy(invite.id, false);
    }
  }

  private markBusy(id: string, busy: boolean): void {
    this.busyIds.update((ids) => {
      const next = new Set(ids);
      if (busy) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  private async load(status: BrandInviteStatus | null): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set('');
    try {
      this.rows.set(await this.admin.brandInvites(status ? { status } : {}));
      this.state.set('ready');
    } catch (error) {
      this.rows.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load brand invites.',
      );
      this.state.set('error');
    }
  }
}
