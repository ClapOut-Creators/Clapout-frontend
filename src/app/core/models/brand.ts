import { PublicCampaign } from '../../features/campaigns/models/campaign';

/** Brand contracts (`/admin/brands`). Every campaign belongs to exactly one brand. */

export type BrandStatus = 'ACTIVE' | 'INACTIVE';

export interface Brand {
  id: string;
  /** kebab of name, unique. */
  slug: string;
  name: string;
  /** https:// or a `data:image/` URL. */
  logoUrl: string | null;
  logoBg: string;
  logoFit: 'cover' | 'contain';
  website: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: BrandStatus;
  /** Computed server side. */
  campaignCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrandStats {
  totalCampaigns: number;
  totalRegistrations: number;
  revenue: number;
}

export interface BrandDetail extends Brand {
  stats: BrandStats;
  /** All statuses including DRAFT, newest first. */
  campaigns: PublicCampaign[];
}

/** Body for `POST /admin/brands`; `PATCH` takes the same fields partially. */
export interface BrandInput {
  name: string;
  logoUrl?: string | null;
  logoBg?: string;
  logoFit?: 'cover' | 'contain';
  website?: string | null;
  industry?: string | null;
  country?: string | null;
  city?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: BrandStatus;
}
