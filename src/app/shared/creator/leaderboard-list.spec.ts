import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CampaignLeaderboard, LeaderboardEntry } from '../../core/models/leaderboard';
import { formatMoneyExact } from '../../core/util/campaign-format';
import {
  avatarGradient,
  earnedAmount,
  entryLabel,
  formatEarnings,
  formatViews,
  LeaderboardList,
  needsOwnStandingFooter,
  rankBadgeClass,
} from './leaderboard-list';

function entry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    rank: 1,
    creatorId: 'creator-1',
    displayName: 'Willian O.',
    verifiedViews: 8400,
    clips: 5,
    isMe: false,
    ...overrides,
  };
}

function board(overrides: Partial<CampaignLeaderboard> = {}): CampaignLeaderboard {
  return { entries: [], totalRanked: 0, me: null, updatedAt: null, ...overrides };
}

describe('rankBadgeClass', () => {
  it('gives the winner the gradient pill and the next two their own fills', () => {
    expect(rankBadgeClass(1)).toContain('bg-gradient-to-br');
    expect(rankBadgeClass(2)).toBe('bg-[#FFC93C]');
    expect(rankBadgeClass(3)).toBe('bg-[#676767]');
  });

  it('treats every rank past third the same', () => {
    expect(rankBadgeClass(4)).toBe('bg-[#CACACA]');
    expect(rankBadgeClass(25)).toBe(rankBadgeClass(4));
  });
});

describe('avatarGradient', () => {
  it('is stable for the same creator', () => {
    expect(avatarGradient('creator-1')).toBe(avatarGradient('creator-1'));
  });

  it('keeps neighbouring ids visibly apart on the wheel', () => {
    expect(avatarGradient('creator-1')).not.toBe(avatarGradient('creator-2'));
  });

  it('produces a usable gradient for an empty id rather than throwing', () => {
    expect(avatarGradient('')).toMatch(/^linear-gradient\(/);
  });
});

describe('entryLabel', () => {
  it('marks the caller’s own row', () => {
    expect(entryLabel({ displayName: 'Willian O.', isMe: true })).toBe('Willian O. (you)');
  });

  it('leaves everyone else alone', () => {
    expect(entryLabel({ displayName: 'Willian O.', isMe: false })).toBe('Willian O.');
  });
});

describe('formatViews', () => {
  it('groups thousands the way the board prints them', () => {
    expect(formatViews(8400)).toBe('8,400');
    expect(formatViews(45)).toBe('45');
  });

  it('never prints a fraction or a NaN', () => {
    expect(formatViews(1234.9)).toBe('1,234');
    expect(formatViews(Number.NaN)).toBe('0');
  });
});

describe('earnedAmount / formatEarnings', () => {
  it('values the views at the campaign CPM, 2 dp, like the API payout', () => {
    expect(earnedAmount(3063, 10)).toBe(30.63);
    expect(earnedAmount(8400, 5)).toBe(42);
    expect(formatEarnings('₵', 3063, 10)).toBe(formatMoneyExact('₵', 30.63));
  });

  it('shows a dash instead of zero while the CPM is unannounced', () => {
    expect(earnedAmount(8400, null)).toBeNull();
    expect(formatEarnings('₵', 8400, null)).toContain('—');
  });
});

describe('needsOwnStandingFooter', () => {
  it('is false when the caller is anonymous or unranked', () => {
    expect(needsOwnStandingFooter(null)).toBe(false);
    expect(needsOwnStandingFooter(board({ entries: [entry()] }))).toBe(false);
  });

  it('is false when the caller already has a row', () => {
    expect(
      needsOwnStandingFooter(
        board({
          entries: [entry({ isMe: true })],
          me: { rank: 1, verifiedViews: 8400, clips: 5 },
        }),
      ),
    ).toBe(false);
  });

  it('is true when the caller ranks past the listed rows', () => {
    expect(
      needsOwnStandingFooter(
        board({ entries: [entry()], me: { rank: 31, verifiedViews: 1200, clips: 2 } }),
      ),
    ).toBe(true);
  });
});

@Component({
  imports: [LeaderboardList],
  template: `<app-leaderboard-list [leaderboard]="leaderboard()" currency="₵" [cpm]="10" />`,
})
class Host {
  readonly leaderboard = signal<CampaignLeaderboard>(board());
}

describe('LeaderboardList', () => {
  async function render(leaderboard: CampaignLeaderboard) {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.leaderboard.set(leaderboard);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('draws one row per entry in rank order: rank, name, views and earnings', async () => {
    const element = await render(
      board({
        entries: [
          entry(),
          entry({ rank: 2, creatorId: 'creator-2', displayName: 'Ama B.', verifiedViews: 1400 }),
        ],
        totalRanked: 2,
      }),
    );

    const rows = element.querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Rank 1');
    expect(rows[0].textContent).toContain('Willian O.');
    expect(rows[0].textContent).toContain('8,400');
    expect(rows[0].textContent).toContain(formatMoneyExact('₵', 84));
    expect(rows[1].textContent).toContain('Ama B.');
    expect(rows[1].textContent).toContain('1,400');
    expect(rows[1].textContent).toContain(formatMoneyExact('₵', 14));
  });

  it('names the caller’s own row without changing anything else about it', async () => {
    const element = await render(
      board({
        entries: [entry({ isMe: true })],
        totalRanked: 1,
        me: { rank: 1, verifiedViews: 8400, clips: 5 },
      }),
    );

    const rows = element.querySelectorAll('li');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Willian O. (you)');
    expect(element.textContent).not.toContain('You are #');
  });

  it('adds the standing footer when the caller ranks past the listed rows', async () => {
    const element = await render(
      board({
        entries: [entry()],
        totalRanked: 40,
        me: { rank: 31, verifiedViews: 1200, clips: 2 },
      }),
    );

    expect(element.textContent).toContain('You are #31 with');
    expect(element.textContent).toContain(formatMoneyExact('₵', 12));
    expect(element.textContent).toContain('1,200 verified views');
  });

  it('says when the board last moved', async () => {
    const recent = new Date(Date.now() - 3 * 3_600_000).toISOString();
    const element = await render(board({ entries: [entry()], totalRanked: 1, updatedAt: recent }));
    expect(element.textContent).toContain('Updated 3h ago');
  });

  it('stays quiet about timing when the board has never moved', async () => {
    const element = await render(board({ entries: [entry()], totalRanked: 1, updatedAt: null }));
    expect(element.textContent).not.toContain('Updated');
  });

  it('explains an empty board instead of drawing an empty list', async () => {
    const element = await render(board());

    expect(element.querySelector('ol')).toBeNull();
    expect(element.textContent).toContain('No verified clips yet');
  });
});
