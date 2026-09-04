import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { provideAppConfiguration } from '../../core/config/app-environment';
import { PublicCampaign } from '../../core/models/campaign';
import { Registration } from '../../core/models/registration';
import { PayoutDetails } from '../../core/models/user';
import { maskAccountNumber, payoutPatch, SubmitPostDialog } from './submit-post-dialog';

const CAMPAIGN = {
  slug: 'e-wale-clipping',
  title: 'E-WALE Clipping',
  demo: false,
  brandId: 'brand-1',
  brand: { name: 'E-wale tech', logoUrl: null, logoBg: '#025af4', logoFit: 'cover' },
  status: 'ACTIVE',
  registrationOpen: true,
  autoApproveRegistrations: false,
  platforms: ['tiktok'],
  currency: '₵',
  cpm: 10,
  budgetSpent: 0,
  budgetTotal: 2000,
  description: '',
  category: 'Fintech',
  startDate: '2026-07-14',
  endDate: null,
  avgReviewTime: '1d',
  tags: [],
  bannerUrl: null,
  requirementsNote: null,
  requirementsDocUrl: null,
  resourceLabel: null,
  resourceUrl: null,
  updatedAt: '2026-09-01T00:00:00.000Z',
} satisfies PublicCampaign;

const REGISTRATION: Registration = {
  id: 'reg-1',
  status: 'ACCEPTED',
  platform: 'tiktok',
  accountUrl: 'https://www.tiktok.com/@clapoutdemo',
  note: null,
  createdAt: '2026-09-02T20:09:11.794Z',
  campaign: { slug: CAMPAIGN.slug, title: CAMPAIGN.title },
};

const SAVED: PayoutDetails = {
  method: 'MTN_MOMO',
  accountNumber: '0241234567',
  accountName: 'Demo Clipper',
};

/**
 * The masked line on the saved-method card. It has to say enough for the
 * clipper to recognise the account and not enough for a shoulder-surfer to
 * reuse it.
 */
describe('maskAccountNumber', () => {
  it('keeps the network prefix and the last four digits', () => {
    expect(maskAccountNumber('0241234567')).toBe('024 ••• 4567');
  });

  it('trims before measuring', () => {
    expect(maskAccountNumber('  0241234567  ')).toBe('024 ••• 4567');
  });

  it('leaves a short number alone rather than masking it into nothing', () => {
    expect(maskAccountNumber('024123')).toBe('024123');
    expect(maskAccountNumber('')).toBe('');
  });
});

/**
 * The overlay only spends a `PATCH /me` when the details actually changed, so
 * re-submitting a second clip on the same session is one round trip, not two.
 */
describe('payoutPatch', () => {
  it('builds the body for a first-time payout', () => {
    expect(
      payoutPatch(null, {
        method: 'MTN_MOMO',
        accountNumber: ' 024 123 4567 ',
        accountName: ' Ama ',
      }),
    ).toEqual({ method: 'MTN_MOMO', accountNumber: '024 123 4567', accountName: 'Ama' });
  });

  it('is null when nothing changed', () => {
    expect(
      payoutPatch(SAVED, {
        method: 'MTN_MOMO',
        accountNumber: '0241234567',
        accountName: 'Demo Clipper',
      }),
    ).toBeNull();
  });

  it('is a body again when any field changed', () => {
    expect(
      payoutPatch(SAVED, {
        method: 'TELECEL_CASH',
        accountNumber: '0241234567',
        accountName: 'Demo Clipper',
      }),
    ).toEqual({ method: 'TELECEL_CASH', accountNumber: '0241234567', accountName: 'Demo Clipper' });
    expect(
      payoutPatch(SAVED, {
        method: 'MTN_MOMO',
        accountNumber: '0201111111',
        accountName: 'Demo Clipper',
      })?.accountNumber,
    ).toBe('0201111111');
  });

  it('is null while the form is still incomplete', () => {
    expect(
      payoutPatch(null, { method: null, accountNumber: '024', accountName: 'Ama' }),
    ).toBeNull();
    expect(
      payoutPatch(null, { method: 'AT_MONEY', accountNumber: '', accountName: 'Ama' }),
    ).toBeNull();
    expect(
      payoutPatch(null, { method: 'AT_MONEY', accountNumber: '024', accountName: ' ' }),
    ).toBeNull();
  });
});

/**
 * Step transitions and the gates between them, driven through the rendered
 * sheet. The sheet is appended to `document.body`, so the queries go through
 * the document rather than the fixture's own element.
 */
describe('SubmitPostDialog', () => {
  let fixture: ComponentFixture<SubmitPostDialog>;

  const sheetText = () => document.querySelector('.co-sheet-root')?.textContent ?? '';
  const title = () => document.querySelector('#co-sheet-title')?.textContent?.trim() ?? '';
  const button = (label: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('.co-sheet-root button')].find((el) =>
      el.textContent?.includes(label),
    );

  async function setInput(selector: string, value: string): Promise<void> {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (!input) {
      throw new Error(`no ${selector}`);
    }
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitPostDialog],
      providers: [
        ConfirmationService,
        MessageService,
        provideAppConfiguration(),
        provideHttpClient(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmitPostDialog);
    fixture.componentRef.setInput('campaign', CAMPAIGN);
    fixture.componentRef.setInput('registration', REGISTRATION);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('opens on the post-link step, with the platform row and the terms links', () => {
    expect(title()).toContain('Post link');
    expect(document.querySelectorAll('.co-sheet-root app-platform-glyph').length).toBeGreaterThan(
      3,
    );
    expect(document.querySelector('.co-sheet-root a[href="/terms"]')).toBeTruthy();
    expect(document.querySelector('.co-sheet-root a[href="/privacy"]')).toBeTruthy();
  });

  it('refuses to leave step 1 without a link, and says so', async () => {
    button('Continue')?.click();
    await fixture.whenStable();

    expect(title()).toContain('Post link');
    expect(sheetText()).toContain('Paste the link to the clip you posted');
  });

  it('refuses a link that is not on the registered platform', async () => {
    await setInput('#submit-post-url', 'https://www.instagram.com/reel/AbC/');
    button('Continue')?.click();
    await fixture.whenStable();

    expect(title()).toContain('Post link');
    expect(sheetText()).toContain('TikTok');
  });

  it('moves to the screenshot step once the link is on the right platform', async () => {
    await setInput('#submit-post-url', 'https://www.tiktok.com/@clapout/video/7000000000000000001');
    button('Continue')?.click();
    await fixture.whenStable();

    expect(title()).toBe('Upload Screenshot');
    // The platform row belongs to the first board only.
    expect(document.querySelectorAll('.co-sheet-root header app-platform-glyph').length).toBe(0);
  });

  it('refuses to leave the screenshot step empty, and goes back to the link', async () => {
    await setInput('#submit-post-url', 'https://www.tiktok.com/@clapout/video/7000000000000000001');
    button('Continue')?.click();
    await fixture.whenStable();

    button('Continue')?.click();
    await fixture.whenStable();
    expect(title()).toBe('Upload Screenshot');
    expect(sheetText()).toContain('Add a screenshot of the post or its analytics.');

    button('Back')?.click();
    await fixture.whenStable();
    expect(title()).toContain('Post link');
    expect(document.querySelector<HTMLInputElement>('#submit-post-url')?.value).toContain(
      'tiktok.com',
    );
  });

  it('gives the dropzone a labelled file input, so it is reachable by keyboard', async () => {
    await setInput('#submit-post-url', 'https://www.tiktok.com/@clapout/video/7000000000000000001');
    button('Continue')?.click();
    await fixture.whenStable();

    const picker = document.querySelector<HTMLInputElement>('#submit-screenshot-file');
    expect(picker?.type).toBe('file');
    expect(picker?.getAttribute('aria-label')).toContain('screenshot');
    expect(document.querySelector('label[for="submit-screenshot-file"]')?.textContent).toContain(
      'Upload image',
    );
  });

  it('closes on Escape while nothing has been entered', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('holds the sheet open on Escape until the discard confirmation is answered', async () => {
    await setInput('#submit-post-url', 'https://www.tiktok.com/@clapout/video/7000000000000000001');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    // Nothing renders `p-confirmdialog` in this fixture, so the guard's promise
    // is still pending — which is exactly the "waiting for an answer" state.
    expect(fixture.componentInstance.visible()).toBe(true);
  });
});
