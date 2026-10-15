import raw from "../data/places.json";
import type { Mood, Place, PlacesFile, Section, SectionId } from "../shared/types";

// `npm run build` validates places.json against the schema, so the production bundle skips zod.
// In dev the schema runs on load, so a bad edit shows up in the console straight away.
const file = raw as PlacesFile;
if (import.meta.env.DEV) {
  import("../shared/schema").then(({ placesFileSchema, crossCheck }) => {
    const parsed = placesFileSchema.safeParse(raw);
    if (!parsed.success) return console.error("data/places.json is invalid", parsed.error.issues);
    crossCheck(parsed.data).errors.forEach((e) => console.error("data/places.json:", e));
  });
}

export const sections: Section[] = file.sections;
export const moods: Mood[] = file.moods;
export const places: Place[] = file.places;
export const dataUpdated = file.updated;

export const sectionById = Object.fromEntries(sections.map((s) => [s.id, s])) as Record<SectionId, Section>;
export const placeById = new Map(places.map((p) => [p.id, p]));
