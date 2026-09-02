import { CampaignPlatform } from './campaign';

/**
 * Body for `POST /admin/campaigns` and (partially) `PATCH /admin/campaigns/:slug`.
 * Everything except title/brand/description/category/currency/platforms is
 * optional so a half-finished draft can always be saved.
 */
export interface CampaignDraftInput {
  title: string;
  slug?: string;
  demo?: boolean;
  /** Campaigns are owned by a Brand; identity comes from the brand record. */
  brandId: string;
  description: string;
  category: string;
  currency: string;
  cpm?: number | null;
  budgetTotal?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  platforms: CampaignPlatform[];
  tags?: string[];
  bannerUrl?: string | null;
  requirementsNote?: string | null;
  requirementsDocUrl?: string | null;
  resourceLabel?: string | null;
  resourceUrl?: string | null;
}

/**
 * `422 INCOMPLETE` from `POST /admin/campaigns/:slug/publish` lists the fields
 * that still need values.
 */
export interface PublishIncompleteDetails {
  missing: string[];
}
