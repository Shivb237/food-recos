/** Which places will show a photo, and from where. Run: npm run places:coverage */
import { readFileSync, existsSync } from "node:fs";
import { placesFileSchema } from "../shared/schema";
import type { PlaceIdsFile } from "../shared/placeIds";

const { places } = placesFileSchema.parse(JSON.parse(readFileSync("data/places.json", "utf8")));
const ids: PlaceIdsFile = existsSync("data/place-ids.json") ? JSON.parse(readFileSync("data/place-ids.json", "utf8")) : { resolvedAt: "", places: {} };

const rows = places.map((p) => {
  const e = ids.places[p.id];
  const source = p.photo ? "owner photo" : e?.approved ? "Google" : e ? "needs review" : "generated card";
  return { source, line: `${p.id.padEnd(34)} ${e ? `${e.status.padEnd(8)} ${e.matchedName}${e.closedOnGoogle ? "  [closed on Google]" : ""}` : ""}` };
});
for (const s of ["owner photo", "Google", "needs review", "generated card"]) {
  const group = rows.filter((r) => r.source === s);
  console.log(`\n${s.toUpperCase()} (${group.length})`);
  group.forEach((r) => console.log("  " + r.line));
}
