/** One restaurant's Google place ID, as resolved by scripts/resolve-place-ids.ts and checked by a person. */
export interface PlaceIdEntry {
  placeId: string;
  matchedName: string;
  address: string;
  distanceKm: number;
  /** verified: Google Maps link matches. good: name and distance fit. weak: needs a look. manual: picked by hand. */
  status: "verified" | "good" | "weak" | "manual";
  /** Only approved entries are used to fetch photos. */
  approved: boolean;
  /** Google reports the business permanently closed. */
  closedOnGoogle: boolean;
}

export interface PlaceIdsFile {
  resolvedAt: string;
  places: Record<string, PlaceIdEntry>;
}
