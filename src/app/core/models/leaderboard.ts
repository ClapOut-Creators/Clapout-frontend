/**
 * `GET /public/campaigns/:slug/leaderboard` — the "Top earners" board on the
 * signed-in campaign page (Figma 398:6785 / 398:6940).
 *
 * The endpoint is public; a valid Bearer token only fills `isMe` and `me`.
 */
export interface LeaderboardEntry {
  /** 1-based; equal views share a rank (1, 2, 2, 4). */
  rank: number;
  creatorId: string;
  /** 'Willian O.' — first name + initial of the last word; never the email. */
  displayName: string;
  /** Sum of `verifiedViews` over APPROVED | PAID submissions on this campaign. */
  verifiedViews: number;
  /** Submissions counted into that sum. */
  clips: number;
  /** The caller's own row (needs a Bearer token; false otherwise). */
  isMe: boolean;
}

export interface CampaignLeaderboard {
  /** Top 25 by `verifiedViews` desc, then earliest first approval. */
  entries: LeaderboardEntry[];
  /** Creators with at least one APPROVED | PAID submission on the campaign. */
  totalRanked: number;
  /**
   * The caller's standing even beyond the top 25; null when anonymous or
   * unranked.
   */
  me: { rank: number; verifiedViews: number; clips: number } | null;
  /**
   * When the board last moved: the latest `viewsCheckedAt ?? reviewedAt` over
   * the clips it counts. null while nothing is ranked.
   */
  updatedAt: string | null;
}
