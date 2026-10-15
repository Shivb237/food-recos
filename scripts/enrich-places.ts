/**
 * Fills EMPTY optional fields in data/places.json from Google's place data, for places with a confirmed Google match.
 * It never overwrites a value that is already there.
 *
 *   npm run places:enrich            (use -- --dry to preview)
 *
 * Fills: googleMapsUrl, rating (Google Maps), price (dining-out price range, per person), cuisine.
 * Swiggy/Zomato links and notes can't come from Google; those come from web research (see CLAUDE.md).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { placesFileSchema, crossCheck } from "../shared/schema";
import type { PlaceIdsFile } from "../shared/placeIds";

const KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY) { console.error("GOOGLE_MAPS_API_KEY missing. Run via: npm run places:enrich"); process.exit(1); }
const dry = process.argv.includes("--dry");
const file = placesFileSchema.parse(JSON.parse(readFileSync("data/places.json", "utf8")));
const ids = (JSON.parse(readFileSync("data/place-ids.json", "utf8")) as PlaceIdsFile).places;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const inr = (n: string | number) => new Intl.NumberFormat("en-IN").format(Number(n));

interface G { rating?: number; userRatingCount?: number; googleMapsUri?: string; primaryTypeDisplayName?: { text: string }; priceRange?: { startPrice?: { units?: string }; endPrice?: { units?: string } } }

let changed = 0;
for (const p of file.places) {
  const e = ids[p.id];
  if (!e?.approved) continue;
  const need = !p.googleMapsUrl || !p.rating || !p.price || !p.cuisine;
  if (!need) continue;
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(e.placeId)}`, {
    headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,primaryTypeDisplayName,priceRange" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) { console.warn(`${p.id}: Google ${res.status}`); await sleep(2000); continue; }
  const g = (await res.json()) as G;
  const filled: string[] = [];
  const cid = g.googleMapsUri?.match(/cid=(\d+)/)?.[1];
  if (!p.googleMapsUrl && cid) { p.googleMapsUrl = `https://maps.google.com/maps?cid=${cid}`; filled.push("maps"); }
  // Closed listings and tiny review counts give misleading ratings, so those are left empty.
  const trustworthy = !e.closedOnGoogle && (g.userRatingCount ?? 0) >= 50;
  if (!p.rating && trustworthy && typeof g.rating === "number" && g.userRatingCount) { p.rating = { value: g.rating, count: inr(g.userRatingCount), source: "Google Maps" }; filled.push(`rating ${g.rating}`); }
  const lo = g.priceRange?.startPrice?.units, hi = g.priceRange?.endPrice?.units;
  if (!p.price && lo && !e.closedOnGoogle) {
    // Google writes "under 200" as 1-200; the site says "Under ₹200".
    p.price = Number(lo) <= 1 && hi ? `Under ₹${inr(hi)} per person` : hi ? `₹${inr(lo)}–${inr(hi)} per person` : `₹${inr(lo)}+ per person`;
    filled.push(`price ${p.price}`);
  }
  // "Vegetarian restaurant" is Google's label; our veg badge says it better and may disagree, so it is not used as a cuisine.
  if (!p.cuisine && g.primaryTypeDisplayName?.text && !/vegetarian|vegan/i.test(g.primaryTypeDisplayName.text)) { p.cuisine = g.primaryTypeDisplayName.text.replace(/\s*restaurant$/i, "").trim() || null; if (p.cuisine) filled.push(`cuisine ${p.cuisine}`); }
  if (filled.length) { changed++; console.log(`${p.id.padEnd(34)} + ${filled.join(", ")}`); }
  await sleep(700);
}
const problems = crossCheck(placesFileSchema.parse(file)).errors;
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
if (!dry && changed) writeFileSync("data/places.json", JSON.stringify(file, null, 2) + "\n");
console.log(`\n${changed} places ${dry ? "would be " : ""}updated`);
