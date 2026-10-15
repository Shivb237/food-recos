import { z } from "zod";
import { SECTION_IDS, VEG_KINDS } from "./types";
import { BANDS, BAND_TIER, bandFor } from "./price";

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
  mealPrice: z.number().int().positive().max(5000).nullable(),
  priceBand: z.enum(BANDS).nullable(),
  priceSource: z.string().min(1).nullable(),
  priceConfidence: z.enum(["menu", "estimate"]).nullable(),
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
    // Price rules: the band is always computed from the meal price, and the ₹ glyphs follow the band.
    if (p.priceBand !== bandFor(p.mealPrice)) errors.push(`${p.id}: priceBand ${p.priceBand} does not match mealPrice ${p.mealPrice}`);
    if (p.priceTier !== (p.priceBand ? BAND_TIER[p.priceBand] : null)) errors.push(`${p.id}: priceTier does not match priceBand`);
    if (p.mealPrice !== null && (!p.priceSource || !p.priceConfidence)) errors.push(`${p.id}: a meal price needs a source and a confidence`);
    // Budget / Mid-range / Premium sections hold only places of that band.
    if ((p.section === "budget" || p.section === "mid" || p.section === "premium") && p.priceBand !== p.section)
      errors.push(`${p.id}: sits in the ${p.section} section but its price band is ${p.priceBand}`);
  }
  if (!file.places.length) errors.push("no places");
  return { errors, warnings };
}
