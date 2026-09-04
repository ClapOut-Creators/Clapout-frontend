/** Option lists shared by the brand and campaign wizards. */

export interface Option<T = string> {
  label: string;
  value: T;
}

/** Ghana first — the platform's home market — then the rest alphabetically. */
export const COUNTRY_OPTIONS: Option[] = [
  'Ghana',
  'Nigeria',
  'Kenya',
  'South Africa',
  'Côte d’Ivoire',
  'Senegal',
  'Tanzania',
  'Uganda',
  'Rwanda',
  'Egypt',
  'Morocco',
  'United Kingdom',
  'United States',
  'Canada',
  'Germany',
  'France',
  'Netherlands',
  'United Arab Emirates',
  'India',
  'Other',
].map((value) => ({ label: value, value }));

/** Major cities per country, so City can be a select with a sensible default set. */
export const CITY_OPTIONS: Record<string, string[]> = {
  Ghana: ['Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast', 'Ho', 'Sunyani', 'Koforidua'],
  Nigeria: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
  'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
};

export const INDUSTRY_OPTIONS: Option[] = [
  'Technology',
  'Fintech',
  'Telecommunications',
  'Retail & E-commerce',
  'Food & Beverage',
  'Fashion & Beauty',
  'Entertainment & Media',
  'Education',
  'Health & Wellness',
  'Travel & Hospitality',
  'Real Estate',
  'Automotive',
  'Financial Services',
  'Non-profit',
  'Other',
].map((value) => ({ label: value, value }));

/**
 * The design's "Product" field maps onto the campaign's `tags`, which is what the
 * public card and detail pages already render.
 */
export const CAMPAIGN_TAG_OPTIONS: Option[] = [
  'Clipping',
  'Product',
  'Service',
  'Event',
  'App',
  'Music',
  'Other',
].map((value) => ({ label: value, value }));

export const CAMPAIGN_CATEGORY_OPTIONS: Option[] = [
  'Product',
  'Service',
  'Event',
  'App',
  'Music',
  'Interview',
  'Podcast',
  'Other',
].map((value) => ({ label: value, value }));

export const CURRENCY_OPTIONS: Option[] = [
  { label: 'GHS ₵ Ghana cedi', value: '₵' },
  { label: 'USD $ US dollar', value: '$' },
];

/**
 * The design shows a free "Views" input on the budget step, but the API has no
 * such field — views are implied by budget ÷ CPM. Rendered read-only instead.
 */
export function estimatedViews(budgetTotal: number | null, cpm: number | null): number | null {
  if (!budgetTotal || !cpm || cpm <= 0) {
    return null;
  }
  return Math.round((budgetTotal / cpm) * 1000);
}
