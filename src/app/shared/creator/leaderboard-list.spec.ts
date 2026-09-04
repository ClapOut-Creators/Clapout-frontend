import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CampaignLeaderboard, LeaderboardEntry } from '../../core/models/leaderboard';
import { shortElapsed } from '../../core/util/relative-time';
import {
  avatarGradient,
  entryLabel,
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
  it('gives the winner the gradient pill and the podium its own fills', () => {
    expect(rankBadgeClass(1)).toContain('bg-gradient-to-br');
    expect(rankBadgeClass(2)).toBe('bg-[#FFC93C]');
    expect(rankBadgeClass(3)).toBe('bg-[#676767]');
  });

  it('treats every rank past the podium the same', () => {
    expect(rankBadgeClass(4)).toBe('bg-[#CACACA]');
    expect(rankBadgeClass(25)).toBe('bg-[#CACACA]');
  });
});

describe('avatarGradient', () => {
  it('is stable for the same creator', () => {
    expect(avatarGradient('abc123')).toBe(avatarGradient('abc123'));
  });

  it('keeps neighbouring ids visibly apart on the wheel', () => {
    const hue = (value: string) => Number(/hsl\((\d+)/.exec(value)?.[1]);
    const distance = Math.abs(hue(avatarGradient('c1')) - hue(avatarGradient('c2')));

    expect(Math.min(distance, 360 - distance)).toBeGreaterThan(60);
  });

  it('produces a usable gradient for an empty id rather than throwing', () => {
    expect(avatarGradient('')).toMatch(/^linear-gradient\(135deg, hsl\(/);
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
    expect(formatViews(1234.7)).toBe('1,234');
    expect(formatViews(Number.NaN)).toBe('0');
  });
});

describe('needsOwnStandingFooter', () => {
  it('is false when the caller is anonymous or unranked', () => {
    expect(needsOwnStandingFooter(null)).toBe(false);
    expect(needsOwnStandingFooter(board())).toBe(false);
  });

  it('is false when the caller already has a row', () => {
    const leaderboard = board({
      entries: [entry({ isMe: true })],
      me: { rank: 1, verifiedViews: 8400, clips: 5 },
    });

    expect(needsOwnStandingFooter(leaderboard)).toBe(false);
  });

  it('is true when the caller ranks past the listed rows', () => {
    const leaderboard = board({
      entries: [entry()],
      me: { rank: 31, verifiedViews: 12, clips: 1 },
    });

    expect(needsOwnStandingFooter(leaderboard)).toBe(true);
  });
});

@Component({
  imports: [LeaderboardList],
  template: `<app-leaderboard-list [leaderboard]="leaderboard()" currency="₵" />`,
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

  it('draws one row per entry, with the rank, the name and the view count', async () => {
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
    // The podium places 2nd on the left of 1st, so match on the board as a whole.
    const text = element.textContent ?? '';
    expect(text).toContain('Willian O.');
    expect(text).toContain('8,400');
    expect(text).toContain('1,400');
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
    expect(element.textContent).toContain('1,200 verified views');
  });

  it('explains an empty board instead of drawing an empty list', async () => {
    const element = await render(board());

    expect(element.querySelector('ol')).toBeNull();
    expect(element.textContent).toContain('No earners yet');
  });

  it('says how long ago the board last moved, beside the period pill', async () => {
    const element = await render(
      board({
        entries: [entry()],
        totalRanked: 1,
        updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      }),
    );

    expect(element.textContent).toContain('Updated 3h ago');
    expect(element.textContent).toContain('All time');
  });

  it('hides the label entirely when the board has never moved', async () => {
    const element = await render(board({ entries: [entry()], totalRanked: 1, updatedAt: null }));

    expect(element.textContent).not.toContain('Updated');
  });
});

describe('shortElapsed', () => {
  const now = Date.parse('2026-09-04T12:00:00.000Z');

  it('degrades from days to hours to minutes', () => {
    expect(shortElapsed('2026-09-01T12:00:00.000Z', now)).toBe('3d ago');
    expect(shortElapsed('2026-09-04T09:00:00.000Z', now)).toBe('3h ago');
    expect(shortElapsed('2026-09-04T11:45:00.000Z', now)).toBe('15m ago');
    expect(shortElapsed('2026-09-04T11:59:30.000Z', now)).toBe('just now');
  });

  it('has nothing to say about a missing or unparsable timestamp', () => {
    expect(shortElapsed(null, now)).toBeNull();
    expect(shortElapsed(undefined, now)).toBeNull();
    expect(shortElapsed('not a date', now)).toBeNull();
  });

  it('never reads as negative when a clock is a little ahead', () => {
    expect(shortElapsed('2026-09-04T12:05:00.000Z', now)).toBe('just now');
  });
});
