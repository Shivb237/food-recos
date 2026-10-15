import idsFile from "../../data/place-ids.json";
import type { PlaceIdsFile } from "../../shared/placeIds";
import type { Place } from "../../shared/types";

const ids = (idsFile as PlaceIdsFile).places;

/** True when Google has a checked listing for this place, so a photo request is worth making. */
export const hasGoogleListing = (id: string) => !!ids[id]?.approved;

/** A real photo is expected: Shivang's own, or Google's. Used to decide the card layout before the photo arrives. */
export const photoExpected = (p: Place) => !!p.photo || hasGoogleListing(p.id);
