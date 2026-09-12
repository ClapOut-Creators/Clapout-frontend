import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { AdminRepository } from '../../core/data/admin-repository';
import { AdminCreator, AdminCreatorQuery } from '../../core/models/admin';
import { NOT_ANNOUNCED } from '../../core/util/campaign-format';
import { initials, socialHandle, whatsappLink } from './clipper-format';
import { campaignsLabel, CreatorsTable, signedUpLabel } from './creators-table';

function creator(overrides: Partial<AdminCreator> = {}): AdminCreator {
  return {
    id: 'creator-1',
    fullName: 'Ama Mensah',
    email: 'ama@clapout.test',
    whatsapp: '+233 20 123 4567',
    phone: '+233201234567',
    socials: [{ url: 'https://www.tiktok.com/@ama' }],
    payout: { method: 'MTN_MOMO', accountNumber: '0244000000', accountName: 'Ama Mensah' },
    communityJoinedAt: '2026-09-09T12:00:00.000Z',
    emailVerifiedAt: '2026-09-09T11:00:00.000Z',
    createdAt: '2026-09-01T08:00:00.000Z',
    registrationCount: 2,
    ...overrides,
  };
}

describe('clipper-format helpers', () => {
  it('builds initials, wa.me links and social handles', () => {
    expect(initials('Ama Mensah')).toBe('AM');
    expect(initials('')).toBe('?');
    expect(whatsappLink('+233 20 123 4567')).toBe('https://wa.me/233201234567');
    expect(whatsappLink('@theboywinner')).toBe('https://wa.me/theboywinner');
    expect(whatsappLink('')).toBeNull();
    expect(socialHandle('https://www.tiktok.com/@ama')).toBe('@ama');
    expect(socialHandle('https://www.fywokod.me.uk')).toBe('fywokod.me.uk');
  });
});

describe('creators table labels', () => {
  it('words the campaign count for zero, one and many', () => {
    expect(campaignsLabel(0)).toBe('None yet');
    expect(campaignsLabel(1)).toBe('1 campaign');
    expect(campaignsLabel(3)).toBe('3 campaigns');
  });

  it('formats the sign-up date and survives a bad one', () => {
    expect(signedUpLabel('2026-09-01T08:00:00.000Z')).toBe('1 Sept 2026');
    expect(signedUpLabel('nope')).toBe(NOT_ANNOUNCED);
  });
});

describe('CreatorsTable', () => {
  const queries: AdminCreatorQuery[] = [];
  let rows: AdminCreator[] = [];

  async function render() {
    queries.length = 0;
    await TestBed.configureTestingModule({
      imports: [CreatorsTable],
      providers: [
        MessageService,
        {
          provide: AdminRepository,
          useValue: {
            creators: async (query: AdminCreatorQuery) => {
              queries.push(query);
              return rows;
            },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CreatorsTable);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('lists every account and flags the ones that never applied', async () => {
    rows = [
      creator(),
      creator({
        id: 'creator-2',
        fullName: 'Kojo Idle',
        email: 'kojo@clapout.test',
        socials: [],
        payout: null,
        communityJoinedAt: null,
        emailVerifiedAt: null,
        registrationCount: 0,
      }),
    ];
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(queries).toEqual([{ search: undefined, filter: undefined }]);
    expect(text).toContain('Ama Mensah');
    expect(text).toContain('2 campaigns');
    expect(text).toContain('In the WhatsApp community');
    expect(text).toContain('Kojo Idle');
    expect(text).toContain('None yet');
    expect(text).toContain('Not in the community yet');
    expect(text).toContain('2 clippers');
    expect(text).toContain('1 not on any campaign yet');
  });

  it('sends the campaign-activity filter to the server', async () => {
    rows = [];
    const fixture = await render();
    (fixture.componentInstance as unknown as { filter: { set(v: string): void } }).filter.set(
      'unregistered',
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(queries[queries.length - 1]).toEqual({ search: undefined, filter: 'unregistered' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No clippers match these filters',
    );
  });
});
