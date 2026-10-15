import { z } from "zod";
import { SECTION_IDS, VEG_KINDS } from "./types";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase-with-dashes");
const url = z.string().url().nullable();

export const placeSchema = z.object({
  id: slug,
  name: z.string().min(1),
  searchName: z.string().min(1),
  placesQuery: z.string().min(1).nullable(),
  section: z.enum(SECTION_IDS),
  cuisine: z.string().min(1).nullable(),
  moods: z.array(z.string()),
  veg: z.enum(VEG_KINDS),
  rating: z
    .object({
      value: z.number().min(1).max(5),
      count: z.string().min(1),
      source: z.enum(["Google Maps", "Swiggy"]),
    })
    .nullable(),
  price: z.string().min(1).nullable(),
  priceTier: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  note: z.string().min(1).nullable(),
  flag: z.string().min(1).nullable(),
  closed: z.boolean(),
  googleMapsUrl: url,
  swiggyUrl: url,
  zomatoUrl: url,
  photo: z.string().startsWith("/").nullable(),
  triedByShivang: z.boolean(),
});

export const placesFileSchema = z.object({
  updated: z.string(),
  area: z.string(),
  sections: z.array(z.object({ id: z.enum(SECTION_IDS), title: z.string(), sub: z.string() })),
  moods: z.array(z.object({ id: slug, short: z.string(), label: z.string() })),
  places: z.array(placeSchema),
});

export const EXPECTED_PLACE_COUNT = 46;

/** Cross-field checks that a plain schema can't express. Returns a list of problems (empty = OK). */
export function crossCheck(file: z.infer<typeof placesFileSchema>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sectionIds = new Set(file.sections.map((s) => s.id));
  const moodIds = new Set(file.moods.map((m) => m.id));
  const seen = new Set<string>();
  for (const p of file.places) {
    if (seen.has(p.id)) errors.push(`duplicate id: ${p.id}`);
    seen.add(p.id);
    if (!sectionIds.has(p.section)) errors.push(`${p.id}: unknown section ${p.section}`);
    for (const m of p.moods) if (!moodIds.has(m)) errors.push(`${p.id}: unknown mood "${m}"`);
    if (!p.cuisine) warnings.push(`${p.id}: no cuisine (card will say "Delivery favourite")`);
    if (p.closed && !p.flag) warnings.push(`${p.id}: closed but has no "Good to know" text`);
  }
  if (file.places.length !== EXPECTED_PLACE_COUNT)
    errors.push(`expected ${EXPECTED_PLACE_COUNT} places, found ${file.places.length}`);
  return { errors, warnings };
}
