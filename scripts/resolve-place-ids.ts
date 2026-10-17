/**
 * Finds each restaurant's Google place ID with Text Search, so photos can be fetched later.
 * Place IDs are allowed to be stored, so this runs once and the result is committed.
 *
 *   npm run places:resolve             resolve places that have no entry yet
 *   npm run places:resolve -- --force  redo everything
 *
 * Writes data/place-ids.json (used by the app) and data/place-id-review.json (candidates, for people).
 * Put a hand-picked ID in data/place-id-overrides.json ({ "slug": "ChIJ..." }) to override a bad match.
 */
import { CENTER, distanceKm } from "../shared/geo";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { placesFileSchema } from "../shared/schema";
import type { PlaceIdEntry, PlaceIdsFile } from "../shared/placeIds";
import { normalise } from "../src/lib/search";

const KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY) {
  console.error("GOOGLE_MAPS_API_KEY is not set. Run via: npm run places:resolve");
  process.exit(1);
}
const force = process.argv.includes("--force");
const read = <T>(file: string, fallback: T): T => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);

const { places } = placesFileSchema.parse(read("data/places.json", null));
const existing = read<PlaceIdsFile>("data/place-ids.json", { resolvedAt: "", places: {} });
// A string pins the place ID; null means "no Google listing" (set in the /dev/photos picker).
const overrides = read<Record<string, string | null>>("data/place-id-overrides.json", {});
const review: Record<string, unknown> = read("data/place-id-review.json", {});

interface Candidate {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  businessStatus?: string;
  googleMapsUri?: string;
}

const km = distanceKm;
const STOP = new Set(["the", "and", "by", "of", "pure", "veg", "hyderabad"]);
const tokens = (s: string) => normalise(s).split(" ").filter((t) => t && !STOP.has(t));
const cidOf = (u?: string | null) => u?.match(/cid=(\d+)/)?.[1];

// The project allows 30 Text Search requests a minute; stay under it, and wait out a 429 if one slips through.
const PAUSE_MS = 2500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function search(query: string, attempt = 1): Promise<Candidate[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5, locationBias: { circle: { center: CENTER, radius: 20000 } } }),
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 429 && attempt <= 3) {
    console.warn(`rate limited, waiting 30s (attempt ${attempt})`);
    await sleep(30000);
    return search(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`Text Search failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { places?: Candidate[] }).places ?? [];
}

function entryFor(c: Candidate, status: PlaceIdEntry["status"], approved: boolean): PlaceIdEntry {
  return {
    placeId: c.id,
    matchedName: c.displayName?.text ?? "",
    address: c.formattedAddress ?? "",
    distanceKm: c.location ? Math.round(km(CENTER, c.location) * 10) / 10 : -1,
    status,
    approved,
    closedOnGoogle: c.businessStatus === "CLOSED_PERMANENTLY",
  };
}

const out: PlaceIdsFile = { resolvedAt: new Date().toISOString().slice(0, 10), places: { ...existing.places } };
const rows: string[] = [];

for (const place of places) {
  if (overrides[place.id] === null) {
    delete out.places[place.id];
    continue;
  }
  if (!force && out.places[place.id] && !overrides[place.id]) continue;
  const query = place.placesQuery ?? `${place.searchName} Hyderabad`;
  const cands = await search(query);
  review[place.id] = { query, candidates: cands.map((c) => ({ id: c.id, name: c.displayName?.text, address: c.formattedAddress, status: c.businessStatus, maps: c.googleMapsUri })) };

  let entry: PlaceIdEntry | null = null;
  if (overrides[place.id]) {
    const c = cands.find((x) => x.id === overrides[place.id]) ?? { id: overrides[place.id] as string };
    entry = entryFor(c, "manual", true);
  } else if (cands.length) {
    const want = tokens(place.searchName);
    const myCid = cidOf(place.googleMapsUrl);
    const scored = cands.map((c) => {
      const have = new Set(tokens(c.displayName?.text ?? ""));
      const sim = want.length ? want.filter((t) => have.has(t)).length / want.length : 0;
      const dist = c.location ? km(CENTER, c.location) : 99;
      const cid = !!myCid && cidOf(c.googleMapsUri) === myCid;
      return { c, sim, dist, cid, score: (cid ? 10 : 0) + sim * 2 - dist / 30 - (c.businessStatus === "CLOSED_PERMANENTLY" ? 0.3 : 0) };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0]!;
    if (best.cid) entry = entryFor(best.c, "verified", true);
    else if (best.sim >= 0.75 && best.dist <= 15) entry = entryFor(best.c, "good", true);
    else if (best.sim >= 0.5) entry = entryFor(best.c, "weak", false);
  }
  if (entry) out.places[place.id] = entry;
  else delete out.places[place.id];
  const e = entry;
  rows.push(`${(e?.status ?? "none").padEnd(8)} ${place.id.padEnd(34)} -> ${e ? `${e.matchedName} (${e.distanceKm} km)${e.closedOnGoogle ? "  [CLOSED ON GOOGLE]" : ""}` : "no usable match"}`);
  await sleep(PAUSE_MS);
}

writeFileSync("data/place-ids.json", JSON.stringify(out, null, 2) + "\n");
writeFileSync("data/place-id-review.json", JSON.stringify(review, null, 2) + "\n");
console.log(rows.join("\n"));
const all = places.map((p) => out.places[p.id]);
const count = (f: (e: PlaceIdEntry | undefined) => boolean) => all.filter(f).length;
console.log(`\napproved: ${count((e) => !!e?.approved)}  weak (needs review): ${count((e) => e?.status === "weak")}  none: ${count((e) => !e)}  of ${places.length}`);
