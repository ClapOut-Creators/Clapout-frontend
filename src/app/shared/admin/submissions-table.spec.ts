import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { AdminSubmission } from '../../core/models/admin';
import { SubmissionViewCheck } from '../../core/models/submission';
import {
  previewPayout,
  reviewErrorMessage,
  STALE_VIEWS_DAYS,
  SubmissionsTable,
  viewsCheckedLabel,
} from './submissions-table';

describe('previewPayout', () => {
  it('pays verifiedViews / 1000 x cpm', () => {
    expect(previewPayout(12_000, 20)).toBe(240);
    expect(previewPayout(500, 20)).toBe(10);
  });

  it('rounds to two decimals, as the backend freezes it', () => {
    expect(previewPayout(1234, 1.5)).toBe(1.85);
    expect(previewPayout(1, 20)).toBe(0.02);
  });

  it('has no preview without a view count or a campaign CPM', () => {
    expect(previewPayout(null, 20)).toBeNull();
    expect(previewPayout(12_000, null)).toBeNull();
    expect(previewPayout(null, null)).toBeNull();
  });

  it('is zero for zero verified views rather than null', () => {
    expect(previewPayout(0, 20)).toBe(0);
  });
});

describe('reviewErrorMessage', () => {
  it('points at the missing campaign rate', () => {
    expect(reviewErrorMessage(new ApiError(422, 'CAMPAIGN_CPM_MISSING', 'No cpm'))).toContain(
      'Add a rate to the campaign first',
    );
  });

  it('explains that paying needs an approval first', () => {
    expect(reviewErrorMessage(new ApiError(422, 'NOT_APPROVED', 'Nope'))).toBe(
      'Approve the clip before marking it paid.',
    );
  });

  it('tells the admin to refresh a row that has gone', () => {
    expect(reviewErrorMessage(new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Gone'))).toContain(
      'Refresh the table',
    );
  });

  it('passes any other server message through', () => {
    expect(reviewErrorMessage(new ApiError(500, 'INTERNAL', 'Something went wrong.'))).toBe(
      'Something went wrong.',
    );
  });

  it('degrades to a retry hint when the failure is not an ApiError', () => {
    expect(reviewErrorMessage(new Error('boom'))).toBe(
      'We could not update this submission. Please try again.',
    );
  });
});

describe('viewsCheckedLabel', () => {
  const now = Date.parse('2026-09-04T12:00:00.000Z');

  it('says "at approval" while nobody has re-checked the figure', () => {
    expect(
      viewsCheckedLabel(
        { reviewedAt: '2026-08-20T12:00:00.000Z', viewsCheckedAt: '2026-08-20T12:00:00.000Z' },
        now,
      ),
    ).toBe('at approval');
  });

  it('ages a later check instead', () => {
    expect(
      viewsCheckedLabel(
        { reviewedAt: '2026-08-20T12:00:00.000Z', viewsCheckedAt: '2026-09-01T12:00:00.000Z' },
        now,
      ),
    ).toBe('3d ago');
  });

  it('has nothing to report before approval', () => {
    expect(viewsCheckedLabel({ reviewedAt: null, viewsCheckedAt: null }, now)).toBeNull();
  });
});

describe('reviewErrorMessage — view checks', () => {
  it('explains that a paid clip is frozen', () => {
    expect(reviewErrorMessage(new ApiError(409, 'SUBMISSION_PAID', 'Paid'))).toContain(
      'already been paid',
    );
  });

  it('explains that only an approved clip can be re-checked', () => {
    expect(reviewErrorMessage(new ApiError(409, 'SUBMISSION_NOT_APPROVED', 'Nope'))).toContain(
      'Only an approved clip',
    );
  });
});

// ------------------------------------------------------------------ the table

function submission(overrides: Partial<AdminSubmission> = {}): AdminSubmission {
  return {
    id: 'sub-1',
    registrationId: 'reg-1',
    status: 'APPROVED',
    platform: 'tiktok',
    postUrl: 'https://tiktok.com/@cara/video/1',
    screenshotUrl: 'data:image/png;base64,AA',
    caption: null,
    claimedViews: 20_000,
    postedAt: '2026-08-20',
    note: null,
    verifiedViews: 18_000,
    payoutAmount: 360,
    reviewNote: null,
    reviewedAt: '2026-08-21T10:00:00.000Z',
    viewsCheckedAt: '2026-08-21T10:00:00.000Z',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-21T10:00:00.000Z',
    viewCheckCount: 1,
    campaign: {
      slug: 'e-wale-clipping',
      title: 'E-WALE Clipping',
      brandName: 'E-wale tech',
      brandLogoUrl: null,
      brandLogoBg: '#015AF4',
      currency: '₵',
      cpm: 20,
      avgReviewTime: '1d',
    },
    creator: {
      id: 'creator-1',
      fullName: 'Cara Creator',
      email: 'cara@clapout.test',
      whatsapp: null,
      phone: null,
      payout: null,
    },
    registration: { id: 'reg-1', platform: 'tiktok', accountUrl: 'https://tiktok.com/@cara' },
    ...overrides,
  };
}

const approved = submission();
const pending = submission({
  id: 'sub-2',
  status: 'SUBMITTED',
  verifiedViews: null,
  payoutAmount: null,
  reviewedAt: null,
  viewsCheckedAt: null,
  viewCheckCount: 0,
  creator: { ...submission().creator, id: 'creator-2', fullName: 'Kofi Clipper' },
});

const check: SubmissionViewCheck = {
  id: 'check-1',
  views: 18_000,
  previousViews: null,
  note: null,
  checkedAt: '2026-08-21T10:00:00.000Z',
  checkedBy: { id: 'admin-1', fullName: 'Ada Admin' },
};

/**
 * The dialog's own state is `protected`, as it is only ever driven from the
 * template. The spec drives that handful of members directly rather than typing
 * into a PrimeNG number input.
 */
interface TableInternals {
  newViews: WritableSignal<number | null>;
  viewCheckNote: WritableSignal<string>;
  staleViewsOnly: WritableSignal<boolean>;
  openViewCheck(row: AdminSubmission): void;
  saveViewCheck(): Promise<void>;
}

function repositoryDouble(overrides: Record<string, unknown> = {}) {
  return {
    submissions: vi.fn().mockResolvedValue([approved, pending]),
    recordViewCheck: vi.fn().mockResolvedValue(submission({ verifiedViews: 21_000 })),
    viewChecks: vi.fn().mockResolvedValue([check]),
    ...overrides,
  };
}

describe('SubmissionsTable — view checks', () => {
  async function render(admin = repositoryDouble()) {
    await TestBed.configureTestingModule({
      imports: [SubmissionsTable],
      providers: [
        ConfirmationService,
        MessageService,
        provideHttpClient(),
        { provide: AdminRepository, useValue: admin },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubmissionsTable);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return {
      admin,
      fixture,
      element: fixture.nativeElement as HTMLElement,
      internals: fixture.componentInstance as unknown as TableInternals,
    };
  }

  afterEach(() => TestBed.resetTestingModule());

  function buttonsLabelled(element: HTMLElement, label: string): HTMLButtonElement[] {
    return Array.from(element.querySelectorAll('button')).filter(
      (button) => button.textContent?.trim() === label,
    );
  }

  it('offers "Update views" on the approved row only, and opens the dialog', async () => {
    const { element, fixture } = await render();

    expect(buttonsLabelled(element, 'Review')).toHaveLength(2);
    const update = buttonsLabelled(element, 'Update views');
    expect(update).toHaveLength(1);

    update[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.querySelector('#view-check-views')).not.toBeNull();
  });

  it('prints how long ago the approved row was last checked', async () => {
    const { element } = await render();

    expect(element.textContent).toContain('Views checked · at approval');
  });

  it('sends the entered views and note, replaces the row and reports the change', async () => {
    const { admin, fixture, internals } = await render();
    let reviewedEvents = 0;
    fixture.componentInstance.reviewed.subscribe(() => (reviewedEvents += 1));

    internals.openViewCheck(approved);
    internals.newViews.set(21_000);
    internals.viewCheckNote.set('Counted from the analytics tab.');
    await internals.saveViewCheck();
    fixture.detectChanges();

    expect(admin.recordViewCheck).toHaveBeenCalledWith('sub-1', {
      views: 21_000,
      note: 'Counted from the analytics tab.',
    });
    expect(reviewedEvents).toBe(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('21,000 verified');
  });

  it('leaves an empty note out of the body entirely', async () => {
    const { admin, internals } = await render();

    internals.openViewCheck(approved);
    internals.newViews.set(19_500);
    internals.viewCheckNote.set('   ');
    await internals.saveViewCheck();

    expect(admin.recordViewCheck).toHaveBeenCalledWith('sub-1', { views: 19_500 });
  });

  it('refuses to open the dialog for a row that is not approved', async () => {
    const { admin, internals } = await render();

    internals.openViewCheck(pending);
    await internals.saveViewCheck();

    expect(admin.recordViewCheck).not.toHaveBeenCalled();
  });

  it('turns a rejected check into admin language rather than a raw code', async () => {
    const admin = repositoryDouble({
      recordViewCheck: vi.fn().mockRejectedValue(new ApiError(409, 'SUBMISSION_PAID', 'Paid')),
    });
    const { fixture, internals } = await render(admin);

    internals.openViewCheck(approved);
    internals.newViews.set(21_000);
    await internals.saveViewCheck();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('already been paid');
  });

  it('asks the API for stale rows when the filter is switched on', async () => {
    const { admin, fixture, internals } = await render();

    expect(admin.submissions).toHaveBeenLastCalledWith(
      expect.objectContaining({ staleViewsDays: undefined }),
    );

    internals.staleViewsOnly.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(admin.submissions).toHaveBeenLastCalledWith(
      expect.objectContaining({ staleViewsDays: STALE_VIEWS_DAYS }),
    );
  });

  it('reads the view history lazily, when a verified row is previewed', async () => {
    const { admin, element, fixture } = await render();

    expect(admin.viewChecks).not.toHaveBeenCalled();

    element
      .querySelector<HTMLButtonElement>('[aria-label="Open the screenshot from Cara Creator"]')
      ?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.viewChecks).toHaveBeenCalledWith('sub-1');
    expect(document.body.textContent).toContain('Ada Admin');
  });
});
