export const SECTION_IDS = ["best", "new", "premium", "healthy", "budget", "special"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

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
  price: string | null;
  /** 1 = under ₹250 per person, 2 = ₹250–700, 3 = above ₹700. Null when price is unknown. */
  priceTier: 1 | 2 | 3 | null;
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
