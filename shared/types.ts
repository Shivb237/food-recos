export const SECTION_IDS = ["best", "new", "premium", "mid", "healthy", "budget", "special"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export type PriceBand = "budget" | "mid" | "premium";

export const VEG_KINDS = ["pure", "both", "options"] as const;
export type VegKind = (typeof VEG_KINDS)[number];

export interface Section {
  id: SectionId;
  title: string;
  sub: string;
}

export interface Mood {
  id: string;
  short: string;
  label: string;
}

export interface Rating {
  value: number;
  /** Display string as found at the source, e.g. "2,878" or "5.2K". */
  count: string;
  source: "Google Maps" | "Swiggy";
}

export interface Place {
  /** Stable slug. Used as the key for photos, likes, comments and deep links. */
  id: string;
  /** Display name. */
  name: string;
  /** Name used for the Swiggy search and the Places lookup. */
  searchName: string;
  /** Optional full query when searchName is ambiguous for Google Places. */
  placesQuery: string | null;
  section: SectionId;
  cuisine: string | null;
  moods: string[];
  veg: VegKind;
  rating: Rating | null;
  /** Dining-out price as found on Google/Swiggy/EazyDiner, e.g. "₹400–600 per person". Not the ordering price. */
  price: string | null;
  /** 1, 2, 3 = budget, mid-range, premium (see shared/price.ts). Null when there is no price data. */
  priceTier: 1 | 2 | 3 | null;
  /** Typical veg main meal for one, in rupees, on the DELIVERY menu (Swiggy/Zomato). Null if unknown or not a meal (sweets). */
  mealPrice: number | null;
  /** Derived from mealPrice by bandFor(). */
  priceBand: PriceBand | null;
  /** Where mealPrice came from, in plain words. Never names the dish on the site. */
  priceSource: string | null;
  /** menu: found on a Swiggy/Zomato menu. estimate: inferred from other signals; please check. */
  priceConfidence: "menu" | "estimate" | null;
  note: string | null;
  /** "Good to know" text. */
  flag: string | null;
  /** True when Google reports the outlet closed; the UI shows "check app". */
  closed: boolean;
  googleMapsUrl: string | null;
  swiggyUrl: string | null;
  zomatoUrl: string | null;
  /** Optional path under /public of Shivang's own photo; overrides Google. */
  photo: string | null;
  triedByShivang: boolean;
}

export interface PlacesFile {
  updated: string;
  area: string;
  sections: Section[];
  moods: Mood[];
  places: Place[];
}
