// Prints the per-place price table (the same data the site uses) so the docs never hold a hand-typed copy.
//   npm run docs:prices
import { readFileSync } from "node:fs";
import type { PlacesFile } from "../shared/types";

const file = JSON.parse(readFileSync(new URL("../data/places.json", import.meta.url), "utf8")) as PlacesFile;
const section = new Map(file.sections.map((s) => [s.id, s.title]));
const rows = [...file.places].sort((a, b) => (b.mealPrice ?? -1) - (a.mealPrice ?? -1));

console.log("| Place | Section | Meal price | Band | Confidence | Source |\n|---|---|---|---|---|---|");
for (const p of rows)
  console.log(`| ${p.name} | ${section.get(p.section)} | ${p.mealPrice ? `₹${p.mealPrice}` : "n/a"} | ${p.priceBand ?? "-"} | ${p.priceConfidence ?? "-"} | ${p.priceSource ?? "No price data found"} |`);
