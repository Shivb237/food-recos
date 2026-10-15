/**
 * Price bands, decided by what a typical VEG main meal for one person costs when you ORDER it (delivery menu on
 * Swiggy/Zomato), not what dining in costs: the two differ, and this site is for ordering.
 */
export const BANDS = ["budget", "mid", "premium"] as const;
export type PriceBand = (typeof BANDS)[number];

/** Menu price in rupees at which each band starts. Budget is everything below the mid line. */
export const MID_FROM = 200;
export const PREMIUM_FROM = 350;

export function bandFor(mealPrice: number | null | undefined): PriceBand | null {
  if (typeof mealPrice !== "number" || !Number.isFinite(mealPrice) || mealPrice <= 0) return null;
  return mealPrice >= PREMIUM_FROM ? "premium" : mealPrice >= MID_FROM ? "mid" : "budget";
}

export const BAND_LABEL: Record<PriceBand, string> = { budget: "Budget", mid: "Mid-range", premium: "Premium" };
export const BAND_TIER: Record<PriceBand, 1 | 2 | 3> = { budget: 1, mid: 2, premium: 3 };

/** Sections that are filled by price band, so a place in one of them must match its band. */
export const PRICE_SECTIONS: readonly PriceBand[] = BANDS;
