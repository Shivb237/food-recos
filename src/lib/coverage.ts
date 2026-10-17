import slugs from "virtual:photo-slugs";
import type { Place } from "../../shared/types";

const withListing = new Set(slugs);

/** True when Google has a checked listing for this place, so a photo request is worth making. */
export const hasGoogleListing = (id: string) => withListing.has(id);

/** A real photo is expected: Shivang's own, or Google's. Used to decide the card layout before the photo arrives. */
export const photoExpected = (p: Place) => !!p.photo || hasGoogleListing(p.id);
